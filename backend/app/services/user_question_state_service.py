"""中文说明：维护本地用户的题目累计状态，供新题去重、错题和复习模式使用。"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.user_question_state import UserQuestionState
from app.schemas.attempt import QuestionStateRead

LOCAL_USER_ID = "local"


def answered_question_ids(db: Session, user_id: str = LOCAL_USER_ID) -> set[str]:
    """中文说明：返回已经提交过答案的题目，用于新题模式排除历史已答题。"""

    state_ids = set(
        db.scalars(
            select(UserQuestionState.question_id).where(
                UserQuestionState.user_id == user_id,
                UserQuestionState.attempt_count > 0,
                UserQuestionState.is_excluded.is_(False),
            )
        ).all()
    )
    if state_ids:
        return state_ids
    return set(db.scalars(select(Attempt.question_id)).all())


def wrong_question_ids(db: Session, user_id: str = LOCAL_USER_ID) -> set[str]:
    """中文说明：返回当前状态仍是错题/复习中的题目；兼容旧库回退到 attempts。"""

    ids = set(
        db.scalars(
            select(UserQuestionState.question_id).where(
                UserQuestionState.user_id == user_id,
                UserQuestionState.status.in_(["wrong", "reviewing"]),
                UserQuestionState.is_excluded.is_(False),
            )
        ).all()
    )
    if ids:
        return ids
    return set(db.scalars(select(Attempt.question_id).where(Attempt.is_correct.is_(False))).all())


def due_question_ids(db: Session, user_id: str = LOCAL_USER_ID) -> set[str]:
    """中文说明：返回到期复习题。"""

    now = datetime.now()
    return set(
        db.scalars(
            select(UserQuestionState.question_id).where(
                UserQuestionState.user_id == user_id,
                UserQuestionState.next_review_at.is_not(None),
                UserQuestionState.next_review_at <= now,
                UserQuestionState.is_excluded.is_(False),
            )
        ).all()
    )


def safe_states_for_questions(db: Session, question_ids: list[str], user_id: str = LOCAL_USER_ID) -> list[QuestionStateRead]:
    """中文说明：返回答题页可展示的安全状态摘要，不泄露历史答案、正确答案或解析。"""

    if not question_ids:
        return []
    rows = db.scalars(
        select(UserQuestionState).where(
            UserQuestionState.user_id == user_id,
            UserQuestionState.question_id.in_(question_ids),
        )
    ).all()
    by_id = {row.question_id: row for row in rows}
    states: list[QuestionStateRead] = []
    for question_id in dict.fromkeys(question_ids):
        state = by_id.get(question_id)
        if not state:
            states.append(QuestionStateRead(question_id=question_id))
            continue
        states.append(
            QuestionStateRead(
                question_id=question_id,
                status=state.status,
                attempt_count=state.attempt_count or 0,
                correct_count=state.correct_count or 0,
                wrong_count=state.wrong_count or 0,
                last_result=state.last_result,
                last_attempt_at=state.last_attempt_at,
                next_review_at=state.next_review_at,
                mastery_level=state.mastery_level or 0,
            )
        )
    return states


def update_state_after_attempt(db: Session, attempt: Attempt, is_final: bool = True, user_id: str = LOCAL_USER_ID) -> UserQuestionState:
    """中文说明：根据一次作答结果更新题目累计状态。主观题待自评时记录 attempted，自评后再修正为最终结果。"""

    state = _get_or_create_state(db, attempt.question_id, user_id)
    now = attempt.created_at or datetime.now()
    state.current_question_version = attempt.question_version
    state.last_attempt_id = attempt.id
    state.last_attempt_at = now
    state.last_answer_snapshot = attempt.user_answer_raw
    state.attempt_count = (state.attempt_count or 0) + 1
    if is_final:
        _apply_final_result(state, attempt, count_result=True)
    else:
        state.status = "attempted"
        state.last_result = "ungraded"
        state.next_review_at = None
    state.updated_at = datetime.now()
    db.add(state)
    return state


def update_state_after_self_review(db: Session, attempt: Attempt, user_id: str = LOCAL_USER_ID) -> UserQuestionState:
    """中文说明：主观题自评完成后，把 pending 状态更新为 correct/partial/wrong。"""

    state = _get_or_create_state(db, attempt.question_id, user_id)
    should_count_result = state.last_attempt_id != attempt.id or state.last_result == "ungraded"
    state.current_question_version = attempt.question_version
    state.last_attempt_id = attempt.id
    state.last_attempt_at = attempt.created_at or datetime.now()
    state.last_answer_snapshot = attempt.user_answer_raw
    _apply_final_result(state, attempt, count_result=should_count_result)
    state.updated_at = datetime.now()
    db.add(state)
    return state


def _get_or_create_state(db: Session, question_id: str, user_id: str) -> UserQuestionState:
    state = db.scalars(
        select(UserQuestionState).where(UserQuestionState.user_id == user_id, UserQuestionState.question_id == question_id)
    ).first()
    if state:
        return state
    return UserQuestionState(id=f"{user_id}:{question_id}", user_id=user_id, question_id=question_id)


def _apply_final_result(state: UserQuestionState, attempt: Attempt, count_result: bool) -> None:
    result = "correct" if attempt.is_correct is True else "wrong" if attempt.is_correct is False else "partial"
    if result == "correct":
        if count_result:
            state.correct_count = (state.correct_count or 0) + 1
        state.consecutive_correct_count = (state.consecutive_correct_count or 0) + 1
        state.consecutive_wrong_count = 0
        state.last_result = "correct"
        state.status = "mastered" if state.consecutive_correct_count >= 4 else "correct"
        state.mastery_level = min(5, (state.mastery_level or 0) + 1)
    elif result == "wrong":
        if count_result:
            state.wrong_count = (state.wrong_count or 0) + 1
        state.consecutive_wrong_count = (state.consecutive_wrong_count or 0) + 1
        state.consecutive_correct_count = 0
        state.last_result = "wrong"
        state.status = "wrong"
        state.mastery_level = max(0, (state.mastery_level or 0) - 1)
    else:
        state.last_result = "partial"
        state.status = "reviewing"
        state.mastery_level = max(0, state.mastery_level or 0)
    state.next_review_at = _next_review_at(state)


def _next_review_at(state: UserQuestionState) -> datetime | None:
    if state.status == "mastered":
        return None
    if state.last_result == "wrong":
        minutes = 30 if state.consecutive_wrong_count >= 2 else 10
        return datetime.now() + timedelta(minutes=minutes)
    if state.consecutive_correct_count >= 3:
        return datetime.now() + timedelta(days=7)
    if state.consecutive_correct_count == 2:
        return datetime.now() + timedelta(days=3)
    if state.consecutive_correct_count == 1:
        return datetime.now() + timedelta(days=1)
    return None
