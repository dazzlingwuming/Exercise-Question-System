"""中文说明：封装提交答案、错题查询和主观题自评逻辑。"""

from __future__ import annotations

from uuid import uuid4
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question
from app.models.practice_session import PracticeSession
from app.schemas.attempt import SubmitAnswerResponse
from app.services.answer_checker import check_answer
from app.services.media_service import MediaError, question_images
from app.services.question_revision_service import question_to_snapshot
from app.services.user_question_state_service import update_state_after_attempt, update_state_after_self_review


def submit_answer(db: Session, question: Question, user_answer: object, practice_session_id: str | None = None) -> SubmitAnswerResponse:
    """中文说明：提交答案后调用题型判分器，并把结果写入答题记录。"""

    if question.is_deleted:
        raise ValueError("题目已删除，不能提交答案")
    if practice_session_id:
        session = db.get(PracticeSession, practice_session_id)
        if not session or question.id not in (session.question_ids_json or []):
            raise ValueError("题目不属于本次练习，请重新打开练习")
    if isinstance(user_answer, str):
        try:
            question_images(db, {**question_to_snapshot(question), "user_answer": user_answer})
        except MediaError as exc:
            raise ValueError(exc.message) from exc
    result = check_answer(question.type, question.standard_answer, user_answer)
    attempt = Attempt(
        id=str(uuid4()),
        question_id=question.id,
        practice_session_id=practice_session_id,
        user_answer_raw=_stringify_answer(user_answer),
        user_answer_normalized=result.normalized_user_answer,
        correct_answer_normalized=result.correct_answer_normalized,
        is_correct=result.is_correct,
        score=result.score,
        max_score=result.max_score,
        review_status="pending" if result.requires_self_review else None,
        question_version=question.version,
        question_snapshot=question_to_snapshot(question),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(attempt)
    update_state_after_attempt(db, attempt, is_final=not result.requires_self_review)
    db.commit()
    db.refresh(attempt)
    return SubmitAnswerResponse(
        attempt_id=attempt.id,
        is_correct=result.is_correct,
        requires_self_review=result.requires_self_review,
        normalized_user_answer=result.normalized_user_answer,
        correct_answer_normalized=result.correct_answer_normalized,
        standard_answer=question.standard_answer,
        explanation=question.explanation,
        exam_points=question.exam_points,
        common_mistakes=question.common_mistakes,
        follow_up_question=question.follow_up_question,
        scoring_standard=question.scoring_standard,
    )


def self_review_attempt(db: Session, attempt: Attempt, status: str) -> Attempt:
    """中文说明：主观题自评会更新正确状态和得分，供错题和统计使用。"""

    score_map = {"correct": 1.0, "partial": 0.5, "wrong": 0.0}
    if status not in score_map:
        raise ValueError("自评状态只能是 correct、partial、wrong")
    if attempt.review_status is None:
        raise ValueError("只有待自评的主观题可以进行自评")
    if attempt.review_status != "pending":
        if attempt.review_status == status:
            # 网络重试或重复点击应保持幂等，不能再次累计答题状态。
            return attempt
        raise ValueError("该答题记录已完成自评；如需更正请重新作答")
    attempt.review_status = status
    attempt.score = score_map[status]
    attempt.max_score = 1.0
    attempt.is_correct = True if status == "correct" else False if status == "wrong" else None
    update_state_after_self_review(db, attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def list_attempts(db: Session, limit: int = 100) -> list[Attempt]:
    """中文说明：按时间倒序返回最近答题记录。"""

    return list(db.scalars(select(Attempt).order_by(Attempt.created_at.desc()).limit(limit)).all())


def latest_attempts_for_questions(db: Session, question_ids: list[str]) -> list[Attempt]:
    """中文说明：按题目 ID 返回每道题最近一次答题记录，用于练习会话恢复作答状态。"""

    if not question_ids:
        return []
    ranked = select(Attempt.id, func.row_number().over(
        partition_by=Attempt.question_id, order_by=(Attempt.created_at.desc(), Attempt.id.desc()),
    ).label("rank")).where(Attempt.question_id.in_(question_ids)).subquery()
    rows = db.scalars(select(Attempt).join(ranked, ranked.c.id == Attempt.id).where(ranked.c.rank == 1)).all()
    by_id = {attempt.question_id: attempt for attempt in rows}
    return [by_id[question_id] for question_id in dict.fromkeys(question_ids) if question_id in by_id]


def list_wrong_attempts(db: Session) -> list[tuple[Attempt, Question]]:
    """中文说明：返回最近一次明确答错的记录和对应题目，用于错题本。"""

    rows = db.execute(
        select(Attempt, Question)
        .join(Question, Question.id == Attempt.question_id)
        .where(Attempt.is_correct.is_(False), Question.is_deleted.is_(False))
        .order_by(Attempt.created_at.desc())
    ).all()
    return [(row[0], row[1]) for row in rows]


def _stringify_answer(answer: object) -> str:
    """中文说明：把用户答案保存成可读文本，数组答案用逗号连接。"""

    if isinstance(answer, list):
        return ",".join(str(item) for item in answer)
    return str(answer)
