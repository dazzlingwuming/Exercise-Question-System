"""中文说明：封装题目查询、筛选和随机抽题逻辑。"""

from __future__ import annotations

import random

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question


def build_question_query(
    type: str | None = None,
    difficulty: str | None = None,
    tag: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    source_id: str | None = None,
    keyword: str | None = None,
    only_wrong: bool = False,
    include_deleted: bool = False,
    only_deleted: bool = False,
) -> Select[tuple[Question]]:
    """中文说明：集中构造题目筛选条件，保证列表页和练习页规则一致。"""

    query = select(Question)
    if only_deleted:
        query = query.where(Question.is_deleted.is_(True))
    elif not include_deleted:
        query = query.where(Question.is_deleted.is_(False))
    if type:
        query = query.where(or_(Question.type == type, Question.type_label == type))
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if source_id:
        query = query.where(Question.source_id == source_id)
    # SQLite 对 JSON list 的 contains([tag]) 会退化成整段 JSON 匹配，
    # 无法命中 ["标签 A", "标签 B"] 这类多标签题目。标签在调用处做精确列表匹配。
    if keyword:
        like = f"%{keyword}%"
        query = query.where(or_(Question.stem.like(like), Question.explanation.like(like), Question.source_text.like(like)))
    if only_wrong:
        wrong_ids = select(Attempt.question_id).where(Attempt.is_correct.is_(False))
        query = query.where(Question.id.in_(wrong_ids))
    return query


def list_questions(db: Session, page: int, page_size: int, **filters: object) -> tuple[int, list[Question]]:
    """中文说明：分页返回题目列表，并单独计算总数。"""

    exam_point = filters.pop("exam_point", None)
    direction = filters.pop("direction", None)
    tag = filters.pop("tag", None)
    query = build_question_query(**filters)
    items = list(db.scalars(query.order_by(Question.import_order.asc().nulls_last(), Question.part_id)).all())
    if tag:
        items = [item for item in items if str(tag) in (item.tags or [])]
    if exam_point:
        items = [item for item in items if str(exam_point) in (item.exam_points or [])]
    if direction:
        items = [item for item in items if str(direction) in (item.directions or [])]
    total = len(items)
    start = (page - 1) * page_size
    return total, items[start:start + page_size]


def get_random_question(
    db: Session,
    type: str | None = None,
    difficulty: str | None = None,
    tag: str | None = None,
    source_id: str | None = None,
    mode: str = "random",
) -> Question | None:
    """中文说明：按练习模式抽取下一题，支持随机、错题和未答题。"""

    query = build_question_query(type=type, difficulty=difficulty, source_id=source_id, only_wrong=mode == "wrong_only")
    if mode == "unanswered":
        answered_ids = select(Attempt.question_id)
        query = query.where(Question.id.not_in(answered_ids))
    items = list(db.scalars(query).all())
    if tag:
        items = [item for item in items if tag in (item.tags or [])]
    return random.choice(items) if items else None
