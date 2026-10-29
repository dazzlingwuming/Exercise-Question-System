"""Small, explainable study queues: overdue work, weak questions, then new material."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question
from app.models.user_question_state import UserQuestionState
from app.services.user_question_state_service import due_condition, wrong_question_id_query


def _candidate_query():
    state = UserQuestionState
    return select(Question.id).outerjoin(
        state, (state.question_id == Question.id) & (state.user_id == "local")
    ).where(Question.is_deleted.is_(False), or_(state.id.is_(None), state.is_excluded.is_(False)))


def daily_question_ids(db: Session, limit: int = 10, filters=None) -> list[str]:
    state = UserQuestionState
    due = due_condition()
    weak = Question.id.in_(wrong_question_id_query(db))
    # Check attempts too: an old database may only have partially backfilled states.
    new = ~select(Attempt.id).where(Attempt.question_id == Question.id).exists()
    query = _candidate_query().where(or_(due, weak, new))
    if filters:
        if filters.type:
            query = query.where(or_(Question.type == filters.type, Question.type_label == filters.type))
        if filters.difficulty:
            query = query.where(Question.difficulty == filters.difficulty)
        for column, value in ((Question.exam_points, filters.exam_point), (Question.directions, filters.direction)):
            if value:
                entries = func.json_each(column).table_valued("value")
                query = query.where(select(entries.c.value).where(entries.c.value == value).exists())
        if filters.collection_id:
            from app.services.question_service import collection_subtree_ids
            query = query.where(Question.collection_id.in_(collection_subtree_ids(db, filters.collection_id, include_descendants=filters.include_descendants)))
        elif filters.source_id:
            query = query.where(Question.source_id == filters.source_id)
    query = query.order_by(
        case((due, 0), (weak, 1), else_=2),
        state.next_review_at.asc().nulls_last(),
        Question.import_order.asc().nulls_last(), Question.id,
    ).limit(limit)
    return list(db.scalars(query).all())


def study_overview(db: Session, utc_offset_minutes: int = 480) -> dict:
    # Attempt timestamps come from SQLite UTC; compute "today" in the browser's zone.
    utc_now = datetime.now(timezone.utc).replace(tzinfo=None)
    local_now = utc_now + timedelta(minutes=utc_offset_minutes)
    start = local_now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(minutes=utc_offset_minutes)
    state = UserQuestionState
    base = _candidate_query().subquery()
    due_count = db.scalar(select(func.count()).select_from(state).where(
        state.user_id == "local", state.question_id.in_(select(base.c.id)),
        due_condition(),
    )) or 0
    today_count = db.scalar(select(func.count(func.distinct(Attempt.question_id))).join(
        Question, Question.id == Attempt.question_id,
    ).where(Question.is_deleted.is_(False), Attempt.created_at >= start, Attempt.created_at < start + timedelta(days=1))) or 0
    return {"due_count": due_count, "today_count": today_count,
            "available_count": len(daily_question_ids(db, 100)), "date": local_now.date().isoformat()}
