"""中文说明：题目列表、详情和提交答案 API。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.models.attempt import Attempt
from app.schemas.attempt import AttemptRead, QuestionHistoryResponse, SubmitAnswerRequest, SubmitAnswerResponse
from app.schemas.question import (
    FilterOptionsResponse,
    QuestionCreate,
    QuestionDeleteRequest,
    QuestionDeleteStatus,
    QuestionListResponse,
    QuestionRead,
    QuestionRevisionRead,
    QuestionRevisionSummary,
    QuestionUpdate,
    RevisionRestoreRequest,
)
from app.services.attempt_service import submit_answer
from app.services.question_create_service import create_question
from app.services.question_delete_service import list_deleted_questions, restore_deleted_question, soft_delete_question
from app.services.question_revision_service import list_revisions, restore_revision, update_question
from app.services.question_validation_service import QuestionValidationError
from app.services.question_service import list_questions

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("", response_model=QuestionRead)
def create_api(payload: QuestionCreate, db: Session = Depends(get_db)) -> QuestionRead:
    """中文说明：页面手动新增题目。"""

    try:
        question = create_question(db, payload)
    except (QuestionValidationError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QuestionRead.model_validate(question)


@router.get("", response_model=QuestionListResponse)
def list_api(
    type: str | None = None,
    difficulty: str | None = None,
    tag: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    keyword: str | None = None,
    only_wrong: bool = False,
    include_deleted: bool = False,
    only_deleted: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> QuestionListResponse:
    """中文说明：支持题型、难度、标签、关键词和错题筛选的题目列表。"""

    total, items = list_questions(
        db,
        page,
        page_size,
        type=type,
        difficulty=difficulty,
        tag=tag,
        exam_point=exam_point,
        direction=direction,
        keyword=keyword,
        only_wrong=only_wrong,
        include_deleted=include_deleted,
        only_deleted=only_deleted,
    )
    return QuestionListResponse(total=total, page=page, page_size=page_size, items=[QuestionRead.model_validate(item) for item in items])


@router.get("/filter-options", response_model=FilterOptionsResponse)
def filter_options_api(db: Session = Depends(get_db)) -> FilterOptionsResponse:
    """中文说明：返回题库筛选和练习配置可用的题型、难度、标签、考察点和方向。"""

    questions = db.query(Question).filter(Question.is_deleted.is_(False)).all()
    return FilterOptionsResponse(
        types=sorted({item.type for item in questions if item.type}),
        difficulties=sorted({item.difficulty for item in questions if item.difficulty}),
        tags=sorted({tag for item in questions for tag in (item.tags or []) if tag}),
        exam_points=sorted({point for item in questions for point in (item.exam_points or []) if point}),
        directions=sorted({direction for item in questions for direction in (item.directions or []) if direction}),
    )


@router.get("/deleted", response_model=QuestionListResponse)
def deleted_questions_api(
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> QuestionListResponse:
    """中文说明：返回回收站中的已删除题目。"""

    total, items = list_deleted_questions(
        db,
        page,
        page_size,
        type=type,
        difficulty=difficulty,
        exam_point=exam_point,
        direction=direction,
        keyword=keyword,
    )
    return QuestionListResponse(total=total, page=page, page_size=page_size, items=[QuestionRead.model_validate(item) for item in items])


@router.get("/{question_id}", response_model=QuestionRead)
def detail_api(question_id: str, db: Session = Depends(get_db)) -> QuestionRead:
    """中文说明：返回单题详情。"""

    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return QuestionRead.model_validate(question)


@router.patch("/{question_id}", response_model=QuestionRead)
def update_api(question_id: str, payload: QuestionUpdate, db: Session = Depends(get_db)) -> QuestionRead:
    """中文说明：编辑题目并写入修改历史，后续判分使用新题目版本。"""

    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    if question.is_deleted:
        raise HTTPException(status_code=400, detail="题目已删除，需先恢复再编辑")
    try:
        updated = update_question(db, question, payload)
    except QuestionValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QuestionRead.model_validate(updated)


@router.delete("/{question_id}", response_model=QuestionDeleteStatus)
def delete_api(question_id: str, payload: QuestionDeleteRequest | None = None, db: Session = Depends(get_db)) -> QuestionDeleteStatus:
    """中文说明：软删除题目，不删除答题记录和修改历史。"""

    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    try:
        deleted = soft_delete_question(db, question, payload.reason if payload else None)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QuestionDeleteStatus(
        question_id=deleted.id,
        is_deleted=deleted.is_deleted,
        deleted_at=deleted.deleted_at,
        delete_reason=deleted.delete_reason,
        deleted_source=deleted.deleted_source,
    )


@router.post("/{question_id}/restore", response_model=QuestionRead)
def restore_deleted_api(question_id: str, payload: QuestionDeleteRequest, db: Session = Depends(get_db)) -> QuestionRead:
    """中文说明：恢复已软删除题目。"""

    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    try:
        restored = restore_deleted_question(db, question, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QuestionRead.model_validate(restored)


@router.get("/{question_id}/revisions", response_model=list[QuestionRevisionSummary])
def revisions_api(question_id: str, db: Session = Depends(get_db)) -> list[QuestionRevisionSummary]:
    """中文说明：返回某题修改历史摘要。"""

    if not db.get(Question, question_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    return [QuestionRevisionSummary.model_validate(item) for item in list_revisions(db, question_id)]


@router.get("/{question_id}/history", response_model=QuestionHistoryResponse)
def question_history_api(question_id: str, db: Session = Depends(get_db)) -> QuestionHistoryResponse:
    """中文说明：历史复盘接口，完整作答记录只在用户主动复盘时返回。"""

    if not db.get(Question, question_id):
        raise HTTPException(status_code=404, detail="题目不存在")
    attempts = db.scalars(
        select(Attempt).where(Attempt.question_id == question_id).order_by(Attempt.created_at.desc())
    ).all()
    return QuestionHistoryResponse(question_id=question_id, attempts=[AttemptRead.model_validate(item) for item in attempts])


@router.get("/{question_id}/revisions/{revision_id}", response_model=QuestionRevisionRead)
def revision_detail_api(question_id: str, revision_id: str, db: Session = Depends(get_db)) -> QuestionRevisionRead:
    """中文说明：返回某条修改历史详情，包含修改前后完整数据。"""

    revision = db.get(QuestionRevision, revision_id)
    if not revision or revision.question_id != question_id:
        raise HTTPException(status_code=404, detail="修改历史不存在")
    return QuestionRevisionRead.model_validate(revision)


@router.post("/{question_id}/revisions/{revision_id}/restore", response_model=QuestionRead)
def restore_api(
    question_id: str,
    revision_id: str,
    payload: RevisionRestoreRequest,
    db: Session = Depends(get_db),
) -> QuestionRead:
    """中文说明：恢复历史版本，恢复动作本身也会生成新的修改历史。"""

    question = db.get(Question, question_id)
    revision = db.get(QuestionRevision, revision_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    if not revision or revision.question_id != question_id:
        raise HTTPException(status_code=404, detail="修改历史不存在")
    try:
        restored = restore_revision(db, question, revision, payload.restore_target, payload.reason)
    except (QuestionValidationError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QuestionRead.model_validate(restored)


@router.post("/{question_id}/submit", response_model=SubmitAnswerResponse)
def submit_api(question_id: str, payload: SubmitAnswerRequest, db: Session = Depends(get_db)) -> SubmitAnswerResponse:
    """中文说明：提交用户答案并返回判分结果和解析。"""

    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    try:
        return submit_answer(db, question, payload.answer, payload.practice_session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
