"""中文说明：练习模式和候选题 API。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.practice import PracticeGroupResponse, PracticeMoveResponse, PracticeSessionCreate, PracticeSessionResponse, PracticeSessionState
from app.schemas.question import QuestionPageResponse, QuestionRead
from app.services.practice_session_service import (
    create_practice_session,
    get_practice_session,
    get_session_group,
    move_to_next_group,
    move_to_next_question,
    move_to_previous_group,
    move_to_previous_question,
)
from app.services.practice_service import PRACTICE_MODES, build_practice_questions, get_next_practice_question

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/modes")
def modes_api() -> list[dict[str, str]]:
    """中文说明：返回前端可选的练习模式列表。"""

    return PRACTICE_MODES


@router.post("/sessions", response_model=PracticeSessionResponse)
def create_practice_session_api(payload: PracticeSessionCreate, db: Session = Depends(get_db)) -> PracticeSessionResponse:
    """中文说明：创建稳定练习会话，返回第一组题目。"""

    return create_practice_session(db, payload)


@router.get("/sessions/{session_id}", response_model=PracticeSessionState)
def get_practice_session_api(session_id: str, db: Session = Depends(get_db)) -> PracticeSessionState:
    """中文说明：恢复练习会话当前状态。"""

    session = get_practice_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return session


@router.get("/sessions/{session_id}/group", response_model=PracticeGroupResponse)
def get_practice_session_group_api(
    session_id: str,
    offset: int = 0,
    limit: int | None = None,
    db: Session = Depends(get_db),
) -> PracticeGroupResponse:
    """中文说明：读取某一组题目，不改变会话游标。"""

    group = get_session_group(db, session_id, offset=offset, limit=limit)
    if not group:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return group


@router.post("/sessions/{session_id}/next", response_model=PracticeMoveResponse)
def next_practice_session_question_api(session_id: str, db: Session = Depends(get_db)) -> PracticeMoveResponse:
    """中文说明：推进到下一题；组末尾返回 group_finished。"""

    result = move_to_next_question(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return result


@router.post("/sessions/{session_id}/previous", response_model=PracticeMoveResponse)
def previous_practice_session_question_api(session_id: str, db: Session = Depends(get_db)) -> PracticeMoveResponse:
    """中文说明：回到上一题。"""

    result = move_to_previous_question(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return result


@router.post("/sessions/{session_id}/next-group", response_model=PracticeSessionResponse)
def next_practice_session_group_api(session_id: str, db: Session = Depends(get_db)) -> PracticeSessionResponse:
    """中文说明：继续下一组题目。"""

    result = move_to_next_group(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return result


@router.post("/sessions/{session_id}/previous-group", response_model=PracticeSessionResponse)
def previous_practice_session_group_api(session_id: str, db: Session = Depends(get_db)) -> PracticeSessionResponse:
    """中文说明：回到上一组题目。"""

    result = move_to_previous_group(db, session_id)
    if not result:
        raise HTTPException(status_code=404, detail="练习会话不存在或已过期")
    return result


@router.get("/questions", response_model=QuestionPageResponse)
def practice_questions_api(
    mode: str = "random",
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    only_wrong: bool = False,
    only_unanswered: bool = False,
    order: str = "import_order",
    page: int = 1,
    page_size: int = 20,
    start_question_id: str | None = None,
    db: Session = Depends(get_db),
) -> QuestionPageResponse:
    """中文说明：按练习模式返回候选题分页，支持错题和专项练习。"""

    result = build_practice_questions(
        db,
        mode=mode,
        type=type,
        difficulty=difficulty,
        exam_point=exam_point,
        direction=direction,
        only_wrong=only_wrong,
        only_unanswered=only_unanswered,
        order=order,
        page=page,
        page_size=page_size,
        start_question_id=start_question_id,
    )
    return QuestionPageResponse(
        items=[QuestionRead.model_validate(item) for item in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        has_next=result.has_next,
    )


@router.get("/next", response_model=QuestionRead)
def next_question(
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    mode: str = "random",
    current_question_id: str | None = None,
    order: str = "import_order",
    db: Session = Depends(get_db),
) -> QuestionRead:
    """中文说明：根据当前题和练习模式返回下一题，保留随机练习兼容。"""

    question = get_next_practice_question(
        db,
        mode=mode,
        current_question_id=current_question_id,
        type=type,
        difficulty=difficulty,
        exam_point=exam_point,
        direction=direction,
        order=order,
    )
    if not question:
        raise HTTPException(status_code=404, detail="没有匹配的题目")
    return QuestionRead.model_validate(question)
