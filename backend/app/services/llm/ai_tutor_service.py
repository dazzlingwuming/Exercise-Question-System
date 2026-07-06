"""中文说明：AI 讲题助手业务服务，负责 thread、权限状态机和消息保存。"""

from __future__ import annotations

import json
from datetime import datetime
from collections.abc import Iterator
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.ai_tutor import AiTutorMessage, AiTutorThread
from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.ai import AiAllowedActions, AiConfig, AiMessageRead, AiThreadResponse
from app.services.llm.deepseek_client import AiClientError, chat_completion, stream_chat_completion
from app.services.llm.intent_router import detect_intent
from app.services.llm.output_guard import guardrail_reply, sanitize_output
from app.services.llm.prompt_builder import build_messages

ACTION_STAGE = {
    "hint": "hint",
    "explanation": "explanation",
    "engineering_example": "engineering_example",
    "interview_followup": "interview_followup",
}


SUMMARY_STAGE = "previous_summary"


def get_thread_response(db: Session, question_id: str, attempt_id: str | None = None) -> AiThreadResponse:
    question = _get_question(db, question_id)
    attempt = _get_attempt(db, attempt_id, question_id)
    thread = _get_or_create_thread(db, question, attempt)
    db.commit()
    db.refresh(thread)
    return _thread_response(db, thread, bool(attempt), include_unsubmitted_messages=False)


def run_action(db: Session, question_id: str, attempt_id: str | None, action: str, config: AiConfig) -> AiThreadResponse:
    if action not in ACTION_STAGE:
        raise AiClientError("ACTION_NOT_ALLOWED", "不支持的 AI 操作。")
    question = _get_question(db, question_id)
    attempt = _get_attempt(db, attempt_id, question_id)
    submitted = bool(attempt)
    thread = _get_or_create_thread(db, question, attempt)
    if not getattr(_allowed(thread, submitted), action):
        raise AiClientError("ACTION_NOT_ALLOWED", _not_allowed_message(action, submitted, thread))
    stage = ACTION_STAGE[action]
    user_content = _action_user_content(action)
    return _append_and_call(db, thread, question, attempt, submitted, stage, user_content, config)


def run_user_message(db: Session, question_id: str, attempt_id: str | None, content: str, config: AiConfig) -> AiThreadResponse:
    question = _get_question(db, question_id)
    attempt = _get_attempt(db, attempt_id, question_id)
    submitted = bool(attempt)
    thread = _get_or_create_thread(db, question, attempt)
    intent = detect_intent(content)
    if not submitted and intent == "answer_leak_request":
        _save_message(db, thread.id, "user", "guardrail", content)
        _save_message(db, thread.id, "assistant", "guardrail", guardrail_reply())
        db.commit()
        return _thread_response(db, thread, submitted, include_unsubmitted_messages=True)
    stage = _stage_from_intent(intent, submitted)
    return _append_and_call(db, thread, question, attempt, submitted, stage, content, config)


def stream_action(db: Session, question_id: str, attempt_id: str | None, action: str, config: AiConfig) -> Iterator[str]:
    """中文说明：执行按钮动作并以 SSE 形式流式返回模型输出。"""

    try:
        if action not in ACTION_STAGE:
            raise AiClientError("ACTION_NOT_ALLOWED", "不支持的 AI 操作。")
        question = _get_question(db, question_id)
        attempt = _get_attempt(db, attempt_id, question_id)
        submitted = bool(attempt)
        thread = _get_or_create_thread(db, question, attempt)
        if not getattr(_allowed(thread, submitted), action):
            raise AiClientError("ACTION_NOT_ALLOWED", _not_allowed_message(action, submitted, thread))
        yield from _append_and_stream(db, thread, question, attempt, submitted, ACTION_STAGE[action], _action_user_content(action), config)
    except AiClientError as exc:
        yield _sse({"type": "error", "error_code": exc.code, "message": exc.message})


def stream_user_message(db: Session, question_id: str, attempt_id: str | None, content: str, config: AiConfig) -> Iterator[str]:
    """中文说明：自由追问并以 SSE 形式流式返回模型输出。"""

    try:
        question = _get_question(db, question_id)
        attempt = _get_attempt(db, attempt_id, question_id)
        submitted = bool(attempt)
        thread = _get_or_create_thread(db, question, attempt)
        intent = detect_intent(content)
        if not submitted and intent == "answer_leak_request":
            _save_message(db, thread.id, "user", "guardrail", content)
            reply = guardrail_reply()
            _save_message(db, thread.id, "assistant", "guardrail", reply)
            db.commit()
            yield _sse({"type": "delta", "content": reply})
            yield _sse({"type": "done", "thread": _thread_response(db, thread, submitted, include_unsubmitted_messages=True).model_dump(mode="json")})
            return
        yield from _append_and_stream(db, thread, question, attempt, submitted, _stage_from_intent(intent, submitted), content, config)
    except AiClientError as exc:
        yield _sse({"type": "error", "error_code": exc.code, "message": exc.message})


def stream_previous_summary(db: Session, question_id: str, attempt_id: str, config: AiConfig) -> Iterator[str]:
    """中文说明：离开题目前把本题 AI 对话压缩成摘要，并删除原始对话消息。"""

    try:
        question = _get_question(db, question_id)
        attempt = _get_attempt(db, attempt_id, question_id)
        if not attempt:
            raise AiClientError("ATTEMPT_NOT_FOUND", "答题记录不存在。")
        thread = _get_or_create_thread(db, question, attempt)
        existing = _summary_message(db, thread.id)
        source_messages = _summary_source_messages(db, thread)
        grading_items, grading_messages = _summary_source_grading_items(db, question.id, attempt.id)
        if existing and not source_messages and not grading_items:
            yield _sse({"type": "delta", "content": existing.content})
            yield _sse({"type": "done", "thread": _thread_response(db, thread, True).model_dump(mode="json")})
            return
        if not source_messages and not grading_items:
            yield _sse({"type": "done", "thread": _thread_response(db, thread, True).model_dump(mode="json")})
            return
        api_key, base_url, model = _resolve_config(config)
        prompt_messages = _build_summary_prompt(question, attempt, source_messages, grading_items, existing.content if existing else None)
        chunks: list[str] = []
        for chunk in stream_chat_completion(api_key=api_key, base_url=base_url, model=model, messages=prompt_messages, max_tokens=500):
            chunks.append(chunk)
            yield _sse({"type": "delta", "content": chunk})
        content = sanitize_output("".join(chunks), submitted=True)
        if existing:
            db.delete(existing)
            db.flush()
        _save_message(db, thread.id, "assistant", SUMMARY_STAGE, content)
        for message in source_messages:
            db.delete(message)
        for message in grading_messages:
            db.delete(message)
        db.commit()
        db.refresh(thread)
        yield _sse({"type": "done", "thread": _thread_response(db, thread, True).model_dump(mode="json")})
    except AiClientError as exc:
        yield _sse({"type": "error", "error_code": exc.code, "message": exc.message})


def test_connection(config: AiConfig) -> str:
    api_key, base_url, model = _resolve_config(config)
    return chat_completion(
        api_key=api_key,
        base_url=base_url,
        model=model,
        messages=[{"role": "user", "content": "请回复：连接成功"}],
        max_tokens=20,
    )


def _append_and_call(
    db: Session,
    thread: AiTutorThread,
    question: Question,
    attempt: Attempt | None,
    submitted: bool,
    stage: str,
    user_content: str,
    config: AiConfig,
) -> AiThreadResponse:
    api_key, base_url, model = _resolve_config(config)
    history = [
        {"role": item.role, "content": item.content}
        for item in _visible_messages(db, thread)
        if item.role in {"user", "assistant"} and item.stage != SUMMARY_STAGE
    ]
    _save_message(db, thread.id, "user", stage, user_content)
    messages = build_messages(question=question, attempt=attempt, submitted=submitted, stage=stage, user_content=user_content, history=history)
    content = chat_completion(api_key=api_key, base_url=base_url, model=model, messages=messages)
    _save_message(db, thread.id, "assistant", stage, sanitize_output(content, submitted=submitted))
    _update_thread_stage(thread, stage, submitted)
    db.commit()
    db.refresh(thread)
    return _thread_response(db, thread, submitted, include_unsubmitted_messages=True)


def _append_and_stream(
    db: Session,
    thread: AiTutorThread,
    question: Question,
    attempt: Attempt | None,
    submitted: bool,
    stage: str,
    user_content: str,
    config: AiConfig,
) -> Iterator[str]:
    api_key, base_url, model = _resolve_config(config)
    history = [
        {"role": item.role, "content": item.content}
        for item in _visible_messages(db, thread)
        if item.role in {"user", "assistant"} and item.stage != SUMMARY_STAGE
    ]
    _save_message(db, thread.id, "user", stage, user_content)
    db.commit()
    messages = build_messages(question=question, attempt=attempt, submitted=submitted, stage=stage, user_content=user_content, history=history)
    chunks: list[str] = []
    for chunk in stream_chat_completion(api_key=api_key, base_url=base_url, model=model, messages=messages):
        chunks.append(chunk)
        yield _sse({"type": "delta", "content": chunk})
    content = sanitize_output("".join(chunks), submitted=submitted)
    _save_message(db, thread.id, "assistant", stage, content)
    _update_thread_stage(thread, stage, submitted)
    db.commit()
    db.refresh(thread)
    yield _sse({"type": "done", "thread": _thread_response(db, thread, submitted, include_unsubmitted_messages=True).model_dump(mode="json")})


def _resolve_config(config: AiConfig) -> tuple[str, str, str]:
    api_key = config.api_key or settings.deepseek_api_key
    if not api_key:
        raise AiClientError("AI_CONFIG_MISSING", "请先配置 DeepSeek API Key。")
    return api_key, config.base_url or settings.deepseek_base_url, config.model or settings.deepseek_model


def _get_question(db: Session, question_id: str) -> Question:
    question = db.get(Question, question_id)
    if not question or question.is_deleted:
        raise AiClientError("QUESTION_NOT_FOUND", "题目不存在或已删除。")
    return question


def _get_attempt(db: Session, attempt_id: str | None, question_id: str) -> Attempt | None:
    if not attempt_id:
        return None
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.question_id != question_id:
        raise AiClientError("ATTEMPT_NOT_FOUND", "答题记录不存在。")
    return attempt


def _get_or_create_thread(db: Session, question: Question, attempt: Attempt | None) -> AiTutorThread:
    thread = db.scalars(
        select(AiTutorThread).where(AiTutorThread.question_id == question.id, AiTutorThread.attempt_id == (attempt.id if attempt else None))
    ).first()
    if thread:
        return thread
    thread = AiTutorThread(id=uuid4().hex, question_id=question.id, attempt_id=attempt.id if attempt else None, current_stage="submitted_not_explained" if attempt else "answering")
    db.add(thread)
    db.flush()
    return thread


def _messages(db: Session, thread_id: str) -> list[AiTutorMessage]:
    return list(db.scalars(select(AiTutorMessage).where(AiTutorMessage.thread_id == thread_id).order_by(AiTutorMessage.created_at.asc())).all())


def _save_message(db: Session, thread_id: str, role: str, stage: str, content: str) -> None:
    db.add(AiTutorMessage(id=uuid4().hex, thread_id=thread_id, role=role, stage=stage, content=content))


def _allowed(thread: AiTutorThread, submitted: bool) -> AiAllowedActions:
    return AiAllowedActions(
        hint=True,
        explanation=submitted,
        engineering_example=submitted,
        interview_followup=submitted,
    )


def _thread_response(db: Session, thread: AiTutorThread, submitted: bool, include_unsubmitted_messages: bool = False) -> AiThreadResponse:
    summary = _summary_message(db, thread.id) if submitted else None
    messages = _messages(db, thread.id) if submitted or include_unsubmitted_messages else []
    messages = [item for item in messages if item.stage != SUMMARY_STAGE]
    return AiThreadResponse(
        thread_id=thread.id,
        question_id=thread.question_id,
        attempt_id=thread.attempt_id,
        submitted=submitted,
        current_stage=thread.current_stage,
        has_hint=thread.has_hint,
        has_explanation=thread.has_explanation,
        has_engineering_example=thread.has_engineering_example,
        has_interview_followup=thread.has_interview_followup,
        allowed_actions=_allowed(thread, submitted),
        messages=[AiMessageRead(role=item.role, stage=item.stage, content=item.content, created_at=item.created_at) for item in messages],
        has_previous_ai_history=_has_summary_source(db, thread) if submitted else False,
        previous_summary=summary.content if summary else None,
    )


def _visible_messages(db: Session, thread: AiTutorThread) -> list[AiTutorMessage]:
    messages: list[AiTutorMessage] = []
    if thread.attempt_id:
        base_thread = db.scalars(select(AiTutorThread).where(AiTutorThread.question_id == thread.question_id, AiTutorThread.attempt_id.is_(None))).first()
        if base_thread:
            messages.extend(_messages(db, base_thread.id))
    messages.extend(_messages(db, thread.id))
    return sorted(messages, key=lambda item: item.created_at or datetime.min)


def _previous_unsubmitted_messages(db: Session, question_id: str) -> list[AiTutorMessage]:
    base_thread = db.scalars(select(AiTutorThread).where(AiTutorThread.question_id == question_id, AiTutorThread.attempt_id.is_(None))).first()
    if not base_thread:
        return []
    return [item for item in _messages(db, base_thread.id) if item.stage != SUMMARY_STAGE]


def _summary_source_messages(db: Session, thread: AiTutorThread) -> list[AiTutorMessage]:
    messages: list[AiTutorMessage] = []
    if thread.attempt_id:
        messages.extend(_previous_unsubmitted_messages(db, thread.question_id))
    messages.extend(item for item in _messages(db, thread.id) if item.stage != SUMMARY_STAGE)
    return sorted(messages, key=lambda item: item.created_at or datetime.min)


def _has_summary_source(db: Session, thread: AiTutorThread) -> bool:
    """中文说明：判断本题是否还有待压缩的 AI 原始记录，包含讲题助手和评分追问。"""

    if _summary_source_messages(db, thread):
        return True
    if not thread.attempt_id:
        return False
    grading_items, _ = _summary_source_grading_items(db, thread.question_id, thread.attempt_id)
    return bool(grading_items)


def _summary_message(db: Session, thread_id: str) -> AiTutorMessage | None:
    return db.scalars(
        select(AiTutorMessage)
        .where(AiTutorMessage.thread_id == thread_id, AiTutorMessage.stage == SUMMARY_STAGE, AiTutorMessage.role == "assistant")
        .order_by(AiTutorMessage.created_at.desc())
    ).first()


def _summary_source_grading_items(db: Session, question_id: str, attempt_id: str) -> tuple[list[dict[str, object]], list[AiGradingMessage]]:
    """中文说明：收集同一次答题下的 AI 评分卡和评分追问，用于统一学习摘要。"""

    results = list(
        db.scalars(
            select(AiGradingResult)
            .where(AiGradingResult.question_id == question_id, AiGradingResult.attempt_id == attempt_id)
            .order_by(AiGradingResult.created_at.asc(), AiGradingResult.id.asc())
        ).all()
    )
    items: list[dict[str, object]] = []
    raw_messages: list[AiGradingMessage] = []
    for result in results:
        messages = list(
            db.scalars(
                select(AiGradingMessage)
                .where(AiGradingMessage.grading_id == result.id)
                .order_by(AiGradingMessage.created_at.asc(), AiGradingMessage.id.asc())
            ).all()
        )
        if not messages:
            continue
        raw_messages.extend(messages)
        items.append(
            {
                "grading_id": result.id,
                "score": result.score,
                "max_score": result.max_score,
                "level": result.level,
                "summary": result.summary,
                "result": result.result_json,
                "conversation": [
                    {"role": message.role, "content": message.content, "created_at": message.created_at.isoformat() if message.created_at else None}
                    for message in messages
                ],
            }
        )
    return items, raw_messages


def _build_summary_prompt(
    question: Question,
    attempt: Attempt,
    previous_messages: list[AiTutorMessage],
    grading_items: list[dict[str, object]] | None = None,
    existing_summary: str | None = None,
) -> list[dict[str, str]]:
    history = [
        {"role": item.role, "stage": item.stage, "content": item.content}
        for item in previous_messages
        if item.role in {"user", "assistant"}
    ]
    return [
        {
            "role": "system",
            "content": (
                "你是一个学习复盘助手。请把用户围绕本题与 AI 的全部互动压缩成学习摘要。"
                "互动来源包括 AI 讲题助手、AI 主观题评分卡和评分追问。"
                "不要复述完整聊天记录，不要新增无关知识。输出 3 到 6 条要点，包含：当时卡点、评分暴露的问题、形成的关键理解、下次复习提醒。"
                "使用中文，控制在 260 字以内。"
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "question_id": question.id,
                    "stem": question.stem,
                    "user_answer": attempt.user_answer_raw,
                    "is_correct": attempt.is_correct,
                    "existing_learning_summary": existing_summary,
                    "ai_tutor_history": history,
                    "ai_grading_history": grading_items or [],
                },
                ensure_ascii=False,
            ),
        },
    ]


def _update_thread_stage(thread: AiTutorThread, stage: str, submitted: bool) -> None:
    if stage == "hint":
        thread.has_hint = True
    elif stage == "explanation":
        thread.has_explanation = True
        thread.current_stage = "explained"
    elif stage == "engineering_example":
        thread.has_engineering_example = True
        thread.current_stage = "example_done"
    elif stage == "interview_followup":
        thread.has_interview_followup = True
        thread.current_stage = "interview_done"
    elif submitted and thread.current_stage == "answering":
        thread.current_stage = "submitted_not_explained"
    thread.updated_at = datetime.now()


def _action_user_content(action: str) -> str:
    return {
        "hint": "请给我提示。",
        "explanation": "请讲解这道题，并分析我的答案。",
        "engineering_example": "请给出一个工程例子。",
        "interview_followup": "请只生成一道面试追问。",
    }[action]


def _stage_from_intent(intent: str, submitted: bool) -> str:
    if not submitted:
        return "hint"
    if intent in {"engineering_example_request"}:
        return "engineering_example"
    if intent in {"interview_followup_request"}:
        return "interview_followup"
    if intent in {"explanation_request", "diagnosis_request"}:
        return "explanation"
    return "free_chat"


def _not_allowed_message(action: str, submitted: bool, thread: AiTutorThread) -> str:
    if not submitted:
        return "提交本题后可查看讲解、工程例子和面试追问。"
    return "当前阶段不允许该操作。"


def _sse(payload: dict[str, object]) -> str:
    return "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"
