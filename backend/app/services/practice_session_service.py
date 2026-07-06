"""中文说明：稳定练习会话服务，处理分组刷题、游标移动和刷新恢复。"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.schemas.practice import (
    PracticeGroupResponse,
    PracticeMoveResponse,
    PracticeSessionCreate,
    PracticeSessionResponse,
    PracticeSessionState,
)
from app.schemas.question import QuestionRead
from app.services.practice_service import build_practice_questions


def create_practice_session(db: Session, payload: PracticeSessionCreate) -> PracticeSessionResponse:
    """
    根据练习模式、筛选条件和每组题数创建一个稳定的练习会话。
    会话创建时会一次性确定本次练习的题目 ID 顺序，
    后续上一题、下一题、继续下一组都基于这个快照执行，
    避免随机模式重复抽题或错题集合动态变化导致练习顺序混乱。
    """

    page_size = max(1, payload.page_size)
    filters = {
        "type": payload.type,
        "difficulty": payload.difficulty,
        "exam_point": payload.exam_point,
        "direction": payload.direction,
        "start_question_id": payload.start_question_id,
        "allow_answered": payload.allow_answered,
    }
    question_ids = build_question_id_list_for_mode(db, payload)
    session = PracticeSession(
        id=uuid4().hex,
        mode=payload.mode,
        filters_json=filters,
        order=payload.order,
        page_size=page_size,
        total=len(question_ids),
        current_index=0,
        question_ids_json=question_ids,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_response(db, session, 0, page_size)


def get_practice_session(db: Session, session_id: str) -> PracticeSessionState | None:
    """中文说明：读取会话当前状态，供页面刷新后恢复。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    _skip_deleted_forward(db, session)
    group_start = _current_group_start(session)
    group_end = min(group_start + session.page_size, session.total)
    group = _questions_by_ids(db, _ids_slice(session, group_start, group_end))
    current_question = _question_at(db, session, session.current_index)
    return PracticeSessionState(
        session_id=session.id,
        mode=session.mode,
        total=session.total,
        page_size=session.page_size,
        current_index=session.current_index,
        current_question=QuestionRead.model_validate(current_question) if current_question else None,
        current_group_start=group_start,
        current_group_end=group_end,
        current_group=[QuestionRead.model_validate(item) for item in group],
        has_next=session.current_index + 1 < session.total,
        has_previous=session.current_index > 0,
        has_next_group=group_end < session.total,
        has_previous_group=group_start > 0,
        filters=session.filters_json or {},
        order=session.order,
    )


def get_session_group(db: Session, session_id: str, offset: int = 0, limit: int | None = None) -> PracticeGroupResponse | None:
    """中文说明：读取某个 offset/limit 对应的会话分组，不改变当前游标。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    limit = limit or session.page_size
    offset = max(0, min(offset, session.total))
    end = min(offset + max(1, limit), session.total)
    return _group_response(db, session, offset, end, session.current_index)


def move_to_next_question(db: Session, session_id: str) -> PracticeMoveResponse | None:
    """中文说明：移动到下一题；到组末尾时不跨组，提示前端继续下一组。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    if session.total == 0 or session.current_index + 1 >= session.total:
        return PracticeMoveResponse(status="session_finished", message="当前练习已全部完成")
    next_index = session.current_index + 1
    group_end = min(_current_group_start(session) + session.page_size, session.total)
    next_index = _next_available_index(db, session, next_index, group_end)
    if next_index is None:
        if _next_available_index(db, session, group_end, session.total) is None:
            return PracticeMoveResponse(status="session_finished", message="当前练习中的题目已被删除或不可用，请重新创建练习。")
        return PracticeMoveResponse(
            status="group_finished",
            current_index=session.current_index,
            has_next=True,
            has_previous=session.current_index > 0,
            has_next_group=group_end < session.total,
            next_group_offset=group_end if group_end < session.total else None,
            message="当前组已完成，可以继续下一组",
        )
    if next_index >= group_end:
        return PracticeMoveResponse(
            status="group_finished",
            current_index=session.current_index,
            has_next=True,
            has_previous=session.current_index > 0,
            has_next_group=group_end < session.total,
            next_group_offset=group_end if group_end < session.total else None,
            message="当前组已完成，可以继续下一组",
        )
    session.current_index = next_index
    _touch(session)
    db.commit()
    db.refresh(session)
    question = _question_at(db, session, session.current_index)
    return PracticeMoveResponse(
        status="ok",
        current_index=session.current_index,
        question=QuestionRead.model_validate(question) if question else None,
        has_next=session.current_index + 1 < session.total,
        has_previous=session.current_index > 0,
        has_next_group=min(_current_group_start(session) + session.page_size, session.total) < session.total,
    )


def move_to_previous_question(db: Session, session_id: str) -> PracticeMoveResponse | None:
    """中文说明：移动到上一题，必要时会回到上一组内的最后一题。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    if session.total == 0 or session.current_index <= 0:
        question = _question_at(db, session, session.current_index)
        return PracticeMoveResponse(
            status="ok",
            current_index=session.current_index,
            question=QuestionRead.model_validate(question) if question else None,
            has_next=session.current_index + 1 < session.total,
            has_previous=False,
            has_next_group=min(_current_group_start(session) + session.page_size, session.total) < session.total,
        )
    session.current_index -= 1
    _touch(session)
    db.commit()
    db.refresh(session)
    question = _question_at(db, session, session.current_index)
    return PracticeMoveResponse(
        status="ok",
        current_index=session.current_index,
        question=QuestionRead.model_validate(question) if question else None,
        has_next=session.current_index + 1 < session.total,
        has_previous=session.current_index > 0,
        has_next_group=min(_current_group_start(session) + session.page_size, session.total) < session.total,
    )


def move_to_next_group(db: Session, session_id: str) -> PracticeSessionResponse | None:
    """中文说明：切换到下一组，不重新生成会话，也不重新随机。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    next_offset = _current_group_start(session) + session.page_size
    while next_offset < session.total and not _questions_by_ids(db, _ids_slice(session, next_offset, min(next_offset + session.page_size, session.total))):
        next_offset += session.page_size
    if next_offset >= session.total:
        return _session_response(db, session, _current_group_start(session), session.page_size)
    session.current_index = _next_available_index(db, session, next_offset, min(next_offset + session.page_size, session.total)) or next_offset
    _touch(session)
    db.commit()
    db.refresh(session)
    return _session_response(db, session, next_offset, session.page_size)


def move_to_previous_group(db: Session, session_id: str) -> PracticeSessionResponse | None:
    """中文说明：切换到上一组。"""

    session = db.get(PracticeSession, session_id)
    if not session:
        return None
    previous_offset = max(0, _current_group_start(session) - session.page_size)
    session.current_index = previous_offset
    _touch(session)
    db.commit()
    db.refresh(session)
    return _session_response(db, session, previous_offset, session.page_size)


def build_question_id_list_for_mode(db: Session, payload: PracticeSessionCreate) -> list[str]:
    """
    根据不同练习模式生成题目 ID 列表。
    这里是练习模式的核心入口，统一处理顺序、随机、错题、未答题、方向、考察点等模式，
    避免前端或 router 自己拼接复杂逻辑。
    """

    query = build_practice_questions(
        db,
        mode=payload.mode,
        type=payload.type,
        difficulty=payload.difficulty,
        exam_point=payload.exam_point,
        direction=payload.direction,
        order=payload.order,
        page=1,
        page_size=1000000,
        allow_answered=payload.allow_answered,
    )
    items = query.items
    if payload.mode == "wrong":
        items = _sort_wrong_questions(db, items, payload.order)
    question_ids = [item.id for item in items]
    if payload.start_question_id:
        question_ids = _rotate_ids_to_start(question_ids, payload.start_question_id)
    return question_ids


def _session_response(db: Session, session: PracticeSession, offset: int, limit: int) -> PracticeSessionResponse:
    end = min(offset + limit, session.total)
    items = _questions_by_ids(db, _ids_slice(session, offset, end))
    return PracticeSessionResponse(
        session_id=session.id,
        mode=session.mode,
        total=session.total,
        page_size=session.page_size,
        current_index=session.current_index,
        current_group_start=offset,
        current_group_end=end,
        items=[QuestionRead.model_validate(item) for item in items],
        has_next_group=end < session.total,
        has_previous_group=offset > 0,
        **_shortage_fields(session),
    )


def _group_response(db: Session, session: PracticeSession, offset: int, end: int, current_index: int) -> PracticeGroupResponse:
    items = _questions_by_ids(db, _ids_slice(session, offset, end))
    return PracticeGroupResponse(
        items=[QuestionRead.model_validate(item) for item in items],
        offset=offset,
        limit=end - offset,
        total=session.total,
        current_index=current_index,
        has_next_group=end < session.total,
        has_previous_group=offset > 0,
    )


def _ids_slice(session: PracticeSession, start: int, end: int) -> list[str]:
    ids = session.question_ids_json or []
    return ids[start:end]


def _question_at(db: Session, session: PracticeSession, index: int) -> Question | None:
    ids = session.question_ids_json or []
    if index < 0 or index >= len(ids):
        return None
    question = db.get(Question, ids[index])
    if not question or question.is_deleted:
        return None
    return question


def _questions_by_ids(db: Session, question_ids: list[str]) -> list[Question]:
    if not question_ids:
        return []
    questions = {
        item.id: item
        for item in db.scalars(
            select(Question).where(Question.id.in_(question_ids), Question.is_deleted.is_(False))
        ).all()
    }
    return [questions[item_id] for item_id in question_ids if item_id in questions]


def _skip_deleted_forward(db: Session, session: PracticeSession) -> None:
    """中文说明：恢复旧 session 时跳过已经软删除的当前题。"""

    next_index = _next_available_index(db, session, session.current_index, session.total)
    if next_index is not None and next_index != session.current_index:
        session.current_index = next_index
        _touch(session)
        db.commit()
        db.refresh(session)


def _next_available_index(db: Session, session: PracticeSession, start: int, end: int) -> int | None:
    """中文说明：在 session 快照范围内寻找下一道未删除题。"""

    for index in range(max(0, start), min(end, session.total)):
        if _question_at(db, session, index):
            return index
    return None


def _current_group_start(session: PracticeSession) -> int:
    if session.page_size <= 0:
        return 0
    return (session.current_index // session.page_size) * session.page_size


def _rotate_ids_to_start(question_ids: list[str], start_question_id: str) -> list[str]:
    if start_question_id not in question_ids:
        return question_ids
    index = question_ids.index(start_question_id)
    return question_ids[index:] + question_ids[:index]


def _sort_wrong_questions(db: Session, items: list[Question], order: str) -> list[Question]:
    if order not in {"latest_wrong", "oldest_wrong", "wrong_count_desc"}:
        return items
    ids = [item.id for item in items]
    if not ids:
        return items
    rows = db.execute(
        select(
            Attempt.question_id,
            func.count(Attempt.id).label("wrong_count"),
            func.max(Attempt.created_at).label("last_wrong_at"),
            func.min(Attempt.created_at).label("first_wrong_at"),
        )
        .where(Attempt.question_id.in_(ids), Attempt.is_correct.is_(False))
        .group_by(Attempt.question_id)
    ).all()
    stats = {row.question_id: row for row in rows}
    if order == "wrong_count_desc":
        return sorted(items, key=lambda item: (-(stats[item.id].wrong_count if item.id in stats else 0), item.import_order or 0, item.id))
    if order == "oldest_wrong":
        return sorted(items, key=lambda item: (stats[item.id].first_wrong_at if item.id in stats else datetime.max, item.import_order or 0, item.id))
    return sorted(items, key=lambda item: (stats[item.id].last_wrong_at if item.id in stats else datetime.min, item.import_order or 0, item.id), reverse=True)


def _touch(session: PracticeSession) -> None:
    session.updated_at = datetime.now()


def _shortage_fields(session: PracticeSession) -> dict[str, object | None]:
    """中文说明：新题模式候选不足一组时明确提示，不静默混入已答题。"""

    filters = session.filters_json or {}
    allow_answered = bool(filters.get("allow_answered"))
    if allow_answered or session.mode in {"wrong", "due_review", "all_practice"}:
        return {}
    if session.total <= 0 or session.total >= session.page_size:
        return {}
    return {
        "shortage_code": "NOT_ENOUGH_NEW_QUESTIONS",
        "requested_count": session.page_size,
        "available_count": session.total,
        "shortage_message": f"当前筛选条件下未答题仅剩 {session.total} 道，不足 {session.page_size} 道；系统不会自动混入已答题。",
    }
