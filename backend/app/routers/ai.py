"""中文说明：AI 讲题助手 API。"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ai import (
    AiActionRequest,
    AiActionResponse,
    AiGradingChatRequest,
    AiGradingHistoryResponse,
    AiGradingRequest,
    AiGradingResultRead,
    AiMessageRead,
    AiSummaryRequest,
    AiTestRequest,
    AiTestResponse,
    AiThreadResponse,
    AiUserMessageRequest,
)
from app.services.llm.ai_grading_service import ask_grading_question, grade_subjective_answer, grading_history, grading_messages, latest_grading, stream_grading_question
from app.services.llm.ai_tutor_service import get_thread_response, run_action, run_user_message, stream_action, stream_previous_summary, stream_user_message, test_connection
from app.services.llm.deepseek_client import AiClientError

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/test-connection", response_model=AiTestResponse)
def test_connection_api(payload: AiTestRequest) -> AiTestResponse:
    """中文说明：测试 DeepSeek 连接，不保存 API Key。"""

    try:
        test_connection(payload)
    except AiClientError as exc:
        return AiTestResponse(ok=False, message=exc.message)
    return AiTestResponse(ok=True, message="DeepSeek 连接成功")


@router.get("/thread", response_model=AiThreadResponse)
def thread_api(question_id: str, attempt_id: str | None = None, db: Session = Depends(get_db)) -> AiThreadResponse:
    """中文说明：获取或创建当前题目的 AI 连续对话。"""

    return get_thread_response(db, question_id, attempt_id)


@router.post("/thread/action", response_model=AiActionResponse)
def action_api(payload: AiActionRequest, db: Session = Depends(get_db)) -> AiActionResponse:
    """中文说明：执行四阶段按钮动作。"""

    try:
        thread = run_action(db, payload.question_id, payload.attempt_id, payload.action, payload)
    except AiClientError as exc:
        return AiActionResponse(ok=False, error_code=exc.code, message=exc.message)
    return AiActionResponse(ok=True, thread=thread)


@router.post("/thread/action-stream")
def action_stream_api(payload: AiActionRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    """中文说明：执行四阶段按钮动作，使用 SSE 流式返回模型输出。"""

    return StreamingResponse(stream_action(db, payload.question_id, payload.attempt_id, payload.action, payload), media_type="text/event-stream")


@router.post("/thread/message", response_model=AiActionResponse)
def message_api(payload: AiUserMessageRequest, db: Session = Depends(get_db)) -> AiActionResponse:
    """中文说明：在当前 AI thread 中自由追问。"""

    try:
        thread = run_user_message(db, payload.question_id, payload.attempt_id, payload.content, payload)
    except AiClientError as exc:
        return AiActionResponse(ok=False, error_code=exc.code, message=exc.message)
    return AiActionResponse(ok=True, thread=thread)


@router.post("/thread/message-stream")
def message_stream_api(payload: AiUserMessageRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    """中文说明：自由追问，使用 SSE 流式返回模型输出。"""

    return StreamingResponse(stream_user_message(db, payload.question_id, payload.attempt_id, payload.content, payload), media_type="text/event-stream")


@router.post("/thread/summary-stream")
def summary_stream_api(payload: AiSummaryRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    """中文说明：提交后把本题提交前 AI 对话压缩为复盘摘要。"""

    return StreamingResponse(stream_previous_summary(db, payload.question_id, payload.attempt_id, payload), media_type="text/event-stream")


@router.post("/grading/grade", response_model=AiGradingResultRead)
def ai_grade_api(payload: AiGradingRequest, db: Session = Depends(get_db)) -> AiGradingResultRead:
    """中文说明：对主观题已提交答案生成 AI 评分卡。"""

    try:
        return grade_subjective_answer(db, payload, payload.question_id, payload.attempt_id)
    except AiClientError as exc:
        raise HTTPException(status_code=400, detail={"error": exc.code, "message": exc.message}) from exc


@router.get("/grading/latest", response_model=AiGradingResultRead)
def latest_grading_api(attempt_id: str, db: Session = Depends(get_db)) -> AiGradingResultRead:
    """中文说明：读取某次答题的最新 AI 评分卡。"""

    return latest_grading(db, attempt_id)


@router.get("/grading/history", response_model=AiGradingHistoryResponse)
def grading_history_api(attempt_id: str, db: Session = Depends(get_db)) -> AiGradingHistoryResponse:
    """中文说明：读取某次答题的 AI 评分历史。"""

    return AiGradingHistoryResponse(items=grading_history(db, attempt_id))


@router.get("/grading/messages", response_model=list[AiMessageRead])
def grading_messages_api(grading_id: int, db: Session = Depends(get_db)) -> list[AiMessageRead]:
    """中文说明：读取某次 AI 评分卡的追问对话。"""

    try:
        return grading_messages(db, grading_id)
    except AiClientError as exc:
        raise HTTPException(status_code=400, detail={"error": exc.code, "message": exc.message}) from exc


@router.post("/grading/message", response_model=AiGradingResultRead)
def grading_message_api(payload: AiGradingChatRequest, db: Session = Depends(get_db)) -> AiGradingResultRead:
    """中文说明：围绕某次 AI 评分卡继续追问。"""

    try:
        return ask_grading_question(db, payload, payload.grading_id, payload.content)
    except AiClientError as exc:
        raise HTTPException(status_code=400, detail={"error": exc.code, "message": exc.message}) from exc


@router.post("/grading/message-stream")
def grading_message_stream_api(payload: AiGradingChatRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    """中文说明：围绕某次 AI 评分卡继续追问，使用 SSE 流式返回。"""

    return StreamingResponse(stream_grading_question(db, payload, payload.grading_id, payload.content), media_type="text/event-stream")
