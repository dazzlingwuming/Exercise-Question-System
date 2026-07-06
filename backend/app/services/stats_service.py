"""中文说明：统计题库规模、正确率、错题和高频错误考察点。"""

from __future__ import annotations

from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.stats import StatsSummary


def get_stats_summary(db: Session) -> StatsSummary:
    """中文说明：聚合首页和统计页需要的基础指标。"""

    total_questions = db.scalar(select(func.count(Question.id)).where(Question.is_deleted.is_(False))) or 0
    answered_count = (
        db.scalar(
            select(func.count(func.distinct(Attempt.question_id)))
            .join(Question, Question.id == Attempt.question_id)
            .where(Question.is_deleted.is_(False))
        )
        or 0
    )
    completed_attempts = db.scalars(
        select(Attempt)
        .join(Question, Question.id == Attempt.question_id)
        .where(Attempt.is_correct.is_not(None), Question.is_deleted.is_(False))
    ).all()
    correct_count = sum(1 for item in completed_attempts if item.is_correct)
    wrong_count = sum(1 for item in completed_attempts if item.is_correct is False)
    accuracy = round(correct_count / len(completed_attempts) * 100, 2) if completed_attempts else None

    type_distribution = dict(
        db.execute(select(Question.type_label, func.count()).where(Question.is_deleted.is_(False)).group_by(Question.type_label)).all()
    )
    difficulty_distribution = dict(
        db.execute(select(Question.difficulty, func.count()).where(Question.is_deleted.is_(False)).group_by(Question.difficulty)).all()
    )
    recent_attempts = [
        attempt_to_dict(item)
        for item in db.scalars(
            select(Attempt)
            .join(Question, Question.id == Attempt.question_id)
            .where(Question.is_deleted.is_(False))
            .order_by(Attempt.created_at.desc())
            .limit(10)
        ).all()
    ]
    frequent_error_points = _frequent_error_points(db)

    return StatsSummary(
        total_questions=total_questions,
        answered_count=answered_count,
        accuracy=accuracy,
        wrong_count=wrong_count,
        type_distribution={str(k or "未标注"): v for k, v in type_distribution.items()},
        difficulty_distribution={str(k or "未标注"): v for k, v in difficulty_distribution.items()},
        recent_attempts=recent_attempts,
        frequent_error_points=frequent_error_points,
    )


def attempt_to_dict(attempt: Attempt) -> dict[str, object]:
    """中文说明：将 Attempt 转成 JSON 友好的轻量结构。"""

    return {
        "id": attempt.id,
        "question_id": attempt.question_id,
        "is_correct": attempt.is_correct,
        "score": attempt.score,
        "review_status": attempt.review_status,
        "created_at": attempt.created_at.isoformat() if attempt.created_at else None,
    }


def _frequent_error_points(db: Session) -> list[dict[str, object]]:
    """中文说明：从错题关联题目的考察点中统计高频薄弱点。"""

    rows = db.execute(
        select(Question.exam_points)
        .join(Attempt, Attempt.question_id == Question.id)
        .where(Attempt.is_correct.is_(False), Question.is_deleted.is_(False))
    ).all()
    counter: Counter[str] = Counter()
    for row in rows:
        for point in row[0] or []:
            counter[point] += 1
    return [{"point": point, "count": count} for point, count in counter.most_common(10)]
