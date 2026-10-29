"""History, bounded multimodal context and atomic generation ownership."""

import base64
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.studio import StudioConversation, StudioMessage, utc_now
from app.schemas.studio import StudioSend
from app.services.media_service import get_asset, read_image, MAX_QUESTION_IMAGE_BYTES

SYSTEM = """你是小鲸学习工作台的助手，帮助用户理解知识、解决问题与整理表达。
使用用户的语言，默认简洁中文。数学公式使用 LaTeX；需要说明过程或关系时可输出 mermaid 代码块，语法保持简单。
图片是日常讨论的一部分。先核实看清的内容；不清晰的数字、符号和条件必须询问，不可猜测。
区分事实、推测和缺失条件。你没有联网搜索、代码执行或生成图片工具，不得声称已经执行这些操作。
对于计算结果说明推导；用户可使用工作台内的计算工具核对。不要冒充工具结果。
"""
MODES = {
    "learn": "采用引导学习方式。先判断用户卡在哪里，分步给提示，适时用一个小问题检验理解；用户明确要完整答案时直接给出。",
    "explain": "优先直接回答，再给必要的依据和步骤；根据用户要求用例子、表格或流程图帮助理解。",
    "create": "协助写作、整理笔记和规划。先交付可用内容，信息不足时明确假设，避免空泛套话。",
}


def recover_stale(db: Session, conversation: StudioConversation) -> None:
    if conversation.active_run_id and (not conversation.run_started_at or conversation.run_started_at < utc_now() - timedelta(seconds=240)):
        old_run = conversation.active_run_id
        changed = db.execute(update(StudioConversation).where(StudioConversation.id == conversation.id, StudioConversation.active_run_id == old_run)
                             .values(active_run_id=None, run_started_at=None)).rowcount
        if changed:
            db.execute(update(StudioMessage).where(StudioMessage.conversation_id == conversation.id, StudioMessage.status == "pending")
                       .values(status="stopped", error="上次生成已中断，可以重试。"))
        db.commit()
        db.refresh(conversation)


def get_conversation(db: Session, conversation_id: str) -> StudioConversation:
    conversation = db.get(StudioConversation, conversation_id)
    if not conversation:
        raise HTTPException(404, "讨论不存在。")
    recover_stale(db, conversation)
    return conversation


def conversation_dict(item: StudioConversation) -> dict:
    return {"id": item.id, "title": item.title, "mode": item.mode, "pinned": item.pinned, "archived": item.archived,
            "busy": bool(item.active_run_id), "created_at": item.created_at.isoformat() + "Z", "updated_at": item.updated_at.isoformat() + "Z"}


def message_dict(item: StudioMessage) -> dict:
    return {"id": item.id, "role": item.role, "content": item.content, "image_ids": item.image_ids,
            "status": item.status, "model": item.model, "error": item.error, "created_at": item.created_at.isoformat() + "Z"}


def history(db: Session, conversation_id: str) -> list[StudioMessage]:
    return list(db.scalars(select(StudioMessage).where(StudioMessage.conversation_id == conversation_id).order_by(StudioMessage.created_at, StudioMessage.id)))


def prepare_run(db: Session, conversation_id: str, payload: StudioSend) -> tuple[str, str, list[dict], dict]:
    conversation = get_conversation(db, conversation_id)
    if conversation.archived:
        raise HTTPException(409, "请先恢复这段讨论，再发送消息。")
    if conversation.active_run_id:
        raise HTTPException(409, "这段讨论仍在生成，请等待完成或停止生成。")
    rows = history(db, conversation_id)
    if payload.retry_message_id:
        if not rows or rows[-1].id != payload.retry_message_id or rows[-1].role != "assistant" or rows[-1].status not in ("error", "stopped"):
            raise HTTPException(409, "只能重试最后一条失败或停止的回复。")
        assistant = rows.pop()
    else:
        if len(rows) >= 200:
            raise HTTPException(400, "这段讨论已达到 100 轮，请开启新讨论；历史仍可查看和导出。")
        created_at = max(utc_now(), rows[-1].created_at + timedelta(microseconds=1)) if rows else utc_now()
        rows.append(StudioMessage(id=uuid4().hex, conversation_id=conversation_id, role="user", content=payload.content.strip(),
                                  image_ids=list(dict.fromkeys(payload.image_ids)), status="complete", created_at=created_at))
        assistant = StudioMessage(id=uuid4().hex, conversation_id=conversation_id, role="assistant", image_ids=[])
    messages, context_info = build_context(db, rows, conversation.mode, payload.connection.supports_images)
    run_id = uuid4().hex
    now = utc_now()
    # A second tab can race us between the read and this update. Only one owns the run.
    claimed = db.execute(update(StudioConversation).where(StudioConversation.id == conversation_id, StudioConversation.active_run_id.is_(None), StudioConversation.archived.is_(False))
                         .values(active_run_id=run_id, run_started_at=now, updated_at=now)).rowcount
    if not claimed:
        db.rollback()
        raise HTTPException(409, "这段讨论已在另一个窗口开始生成。")
    if not payload.retry_message_id:
        user = rows[-1]
        db.add(user)
        if len(rows) == 1:
            conversation.title = (user.content or "图片讨论")[:40].replace("\n", " ")
        assistant.created_at = max(now, user.created_at + timedelta(microseconds=1))
    assistant.content, assistant.status, assistant.error, assistant.model = "", "pending", None, payload.connection.model
    db.add(assistant)
    db.commit()
    return run_id, assistant.id, messages, context_info


def build_context(db: Session, rows: list[StudioMessage], mode: str, supports_images: bool) -> tuple[list[dict], dict]:
    # Keep whole turns and the latest question. Old attachments are bounded with their turns.
    turns: list[list[StudioMessage]] = []
    for row in rows:
        if row.role == "user":
            turns.append([row])
        elif turns and row.status == "complete":
            turns[-1].append(row)
    selected: list[list[StudioMessage]] = []
    image_ids: set[str] = set()
    assets = {}
    chars = 0
    for turn in reversed(turns[-10:]):
        turn_chars = sum(len(row.content or "") for row in turn)
        turn_ids = {image_id for row in turn for image_id in row.image_ids}
        if selected and (chars + turn_chars > 60000 or len(image_ids | turn_ids) > 6):
            break
        for image_id in turn_ids:
            if image_id not in assets:
                assets[image_id] = get_asset(db, image_id)
        if sum(assets[image_id].size_bytes for image_id in image_ids | turn_ids) > MAX_QUESTION_IMAGE_BYTES:
            if not selected:
                raise HTTPException(400, "本轮图片合计不能超过 20 MiB。")
            break
        selected.insert(0, turn)
        image_ids |= turn_ids
        chars += turn_chars
    if image_ids and not supports_images:
        raise HTTPException(400, "这段上下文包含图片。请选择支持图片的模型连接，或开启纯文字的新讨论。")
    encoded = {key: f"data:{assets[key].mime_type};base64,{base64.b64encode(read_image(assets[key])).decode()}" for key in image_ids}
    result = [{"role": "system", "content": SYSTEM + MODES[mode]}]
    for turn in selected:
        for row in turn:
            content = row.content or "请帮我理解图片中的内容。"
            if row.image_ids:
                content = [{"type": "text", "text": content}, *[{"type": "image_url", "image_url": {"url": encoded[key]}} for key in row.image_ids]]
            result.append({"role": row.role, "content": content})
    return result, {"context_messages": len(result) - 1, "history_trimmed": len(selected) < len(turns), "image_count": len(image_ids)}


def finish_run(bind, conversation_id: str, run_id: str, message_id: str, content: str, status: str, error: str | None) -> None:
    # The response may outlive the request dependency. Use a short independent transaction.
    with Session(bind) as db:
        claimed = db.execute(update(StudioConversation).where(StudioConversation.id == conversation_id, StudioConversation.active_run_id == run_id)
                             .values(active_run_id=None, run_started_at=None, updated_at=utc_now())).rowcount
        if claimed:
            db.execute(update(StudioMessage).where(StudioMessage.id == message_id).values(content=content, status=status, error=error))
        db.commit()
