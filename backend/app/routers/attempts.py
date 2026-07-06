"""中文说明：答题记录、错题本和主观题自评 API。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attempt import Attempt
from app.schemas.attempt import AttemptRead, QuestionStateRead, SelfReviewRequest, WrongQuestionItem, WrongQuestionPageResponse
from app.schemas.question import QuestionRead
from app.services.attempt_service import latest_attempts_for_questions, list_attempts, self_review_attempt
from app.services.user_question_state_service import safe_states_for_questions
from app.services.wrong_question_service import list_wrong_questions

router = APIRouter(prefix="/attempts", tags=["attempts"])


@router.get("", response_model=list[AttemptRead])
def attempts_api(db: Session = Depends(get_db)) -> list[AttemptRead]:
    """中文说明：返回最近答题记录。"""

    return [AttemptRead.model_validate(item) for item in list_attempts(db)]


@router.get("/latest", response_model=list[AttemptRead])
def latest_attempts_api(question_ids: str = "", db: Session = Depends(get_db)) -> list[AttemptRead]:
    """中文说明：返回最近答题记录；仅供复盘/调试使用，答题页不要调用。"""

    ids = [item.strip() for item in question_ids.split(",") if item.strip()]
    return [AttemptRead.model_validate(item) for item in latest_attempts_for_questions(db, ids)]


@router.get("/question-states", response_model=list[QuestionStateRead])
def question_states_api(question_ids: str = "", db: Session = Depends(get_db)) -> list[QuestionStateRead]:
    """中文说明：返回答题页安全状态摘要，不包含历史答案、正确答案或解析。"""

    ids = [item.strip() for item in question_ids.split(",") if item.strip()]
    return safe_states_for_questions(db, ids)


@router.get("/wrong", response_model=WrongQuestionPageResponse)
def wrong_api(
    page: int = 1,
    page_size: int = 20,
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    keyword: str | None = None,
    sort: str = "latest_wrong",
    db: Session = Depends(get_db),
) -> WrongQuestionPageResponse:
    """中文说明：分页返回按题目聚合的错题，支持筛选和排序。"""

    result = list_wrong_questions(db, page, page_size, type, difficulty, exam_point, direction, keyword, sort)
    return WrongQuestionPageResponse(
        items=[
            WrongQuestionItem(
                attempt=AttemptRead.model_validate(row.attempt),
                question=QuestionRead.model_validate(row.question),
                wrong_count=row.wrong_count,
                last_wrong_at=row.last_wrong_at,
                last_wrong_answer=row.last_wrong_answer,
            )
            for row in result.items
        ],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        has_next=result.has_next,
    )


@router.post("/{attempt_id}/self-review", response_model=AttemptRead)
def self_review_api(attempt_id: str, payload: SelfReviewRequest, db: Session = Depends(get_db)) -> AttemptRead:
    """中文说明：保存主观题自评结果。"""

    attempt = db.get(Attempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="答题记录不存在")
    try:
        updated = self_review_attempt(db, attempt, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AttemptRead.model_validate(updated)
