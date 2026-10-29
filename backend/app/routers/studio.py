import asyncio
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.studio import StudioConversation, StudioMessage
from app.schemas.studio import ConversationCreate, ConversationUpdate, MathRequest, ModelConnection, StudioSend
from app.services.llm.compatible_transport import ConnectionError, stream_reply
from app.services.math_tools import MathInputError, calculate
from app.services.studio_service import conversation_dict, finish_run, get_conversation, history, message_dict, prepare_run

router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/conversations")
def list_conversations(q: str = Query(default="", max_length=120), archived: bool = False,
                       offset: int = Query(default=0, ge=0), db: Session = Depends(get_db)):
    query = select(StudioConversation).where(StudioConversation.archived == archived)
    if q.strip():
        query = query.where(StudioConversation.title.contains(q.strip(), autoescape=True))
    rows = list(db.scalars(query.order_by(StudioConversation.pinned.desc(), StudioConversation.updated_at.desc(), StudioConversation.id).offset(offset).limit(31)))
    return {"items": [conversation_dict(row) for row in rows[:30]], "has_more": len(rows) > 30}


@router.post("/conversations", status_code=201)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    row = StudioConversation(id=uuid4().hex, mode=payload.mode)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {**conversation_dict(row), "messages": []}


@router.get("/conversations/{conversation_id}")
def read_conversation(conversation_id: str, db: Session = Depends(get_db)):
    row = get_conversation(db, conversation_id)
    return {**conversation_dict(row), "messages": [message_dict(item) for item in history(db, conversation_id)]}


@router.get("/conversations/{conversation_id}/status")
def conversation_status(conversation_id: str, db: Session = Depends(get_db)):
    return conversation_dict(get_conversation(db, conversation_id))


@router.patch("/conversations/{conversation_id}")
def update_conversation(conversation_id: str, payload: ConversationUpdate, db: Session = Depends(get_db)):
    row = get_conversation(db, conversation_id)
    if row.active_run_id:
        raise HTTPException(409, "生成结束后才能修改讨论。")
    values = payload.model_dump(exclude_none=True)
    if values:
        changed = db.execute(update(StudioConversation).where(StudioConversation.id == conversation_id, StudioConversation.active_run_id.is_(None)).values(**values)).rowcount
        if not changed:
            db.rollback()
            raise HTTPException(409, "讨论正在另一个窗口生成，请稍后修改。")
    db.commit()
    db.refresh(row)
    return conversation_dict(row)


def event(name: str, data: dict) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, payload: StudioSend, db: Session = Depends(get_db)):
    run_id, message_id, context, info = prepare_run(db, conversation_id, payload)
    bind = db.get_bind()
    recent = list(db.scalars(select(StudioMessage).where(StudioMessage.conversation_id == conversation_id)
                            .order_by(StudioMessage.created_at.desc(), StudioMessage.id.desc()).limit(2)))
    initial = {"message_id": message_id, "turn": [message_dict(row) for row in reversed(recent)], **info}
    db.rollback()  # Release the read connection before waiting on the remote stream.

    async def generate():
        content, status, error = "", "stopped", "生成已停止，可重试最后一条回复。"
        try:
            yield event("start", initial)
            async with asyncio.timeout(180):
                async for delta in stream_reply(payload.connection, context):
                    if len(content) + len(delta) > 64000:
                        raise ConnectionError("回复过长，已保留部分内容。请缩小问题范围后继续。")
                    content += delta
                    yield event("delta", {"content": delta})
            status, error = "complete", None
        except asyncio.CancelledError:
            raise
        except TimeoutError:
            status, error = "error", "生成超过 3 分钟，已保留收到的内容，可以重试。"
        except ConnectionError as exc:
            status, error = "error", str(exc)
        except Exception:
            status, error = "error", "生成未能完成，已保留收到的内容。请检查模型连接后重试。"
        finally:
            finish_run(bind, conversation_id, run_id, message_id, content, status, error)
        if error:
            yield event("error", {"message": error})
        else:
            yield event("done", {"message_id": message_id})
    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/messages/{message_id}/question-draft")
def question_draft(message_id: str, db: Session = Depends(get_db)):
    message = db.get(StudioMessage, message_id)
    if not message or message.role != "assistant" or message.status != "complete":
        raise HTTPException(400, "请选择一条完整的 AI 回复。")
    rows = history(db, message.conversation_id)
    index = next(i for i, row in enumerate(rows) if row.id == message.id)
    if not index or rows[index - 1].role != "user":
        raise HTTPException(400, "找不到对应问题。")
    user = rows[index - 1]
    images = "\n\n".join(f"![原始附图 {i + 1}](/api/media/images/{image_id})" for i, image_id in enumerate(user.image_ids))
    return {"type": "short_answer", "type_label": "简答题", "difficulty": "2", "tags": ["AI 讨论"], "directions": [],
            "stem": (user.content or "请根据图片回答问题。") + ("\n\n" + images if images else ""), "material": "", "options": [],
            "standard_answer": message.content, "explanation": "", "exam_points": [], "common_mistakes": "",
            "follow_up_question": "", "scoring_standard": "", "reason": "从 AI 工作台整理；请核对题干和答案后保存。"}


@router.post("/connection/check")
async def check_connection(connection: ModelConnection):
    try:
        async with asyncio.timeout(25):
            async for _ in stream_reply(connection, [{"role": "user", "content": "Reply only with OK."}], max_tokens=128):
                pass
    except (ConnectionError, TimeoutError) as exc:
        raise HTTPException(400, str(exc) or "连接测试超时。") from exc
    return {"ok": True, "model": connection.model}


@router.post("/tools/math")
def math_tool(payload: MathRequest):
    try:
        return calculate(payload)
    except MathInputError as exc:
        raise HTTPException(400, str(exc)) from exc
