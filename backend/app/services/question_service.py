"""中文说明：封装题目查询、集合筛选和安全的 API 输出装配。"""

from __future__ import annotations

import random

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question
from app.models.question_collection import ROOT_COLLECTION_ID, QuestionCollection, UNFILED_COLLECTION_ID
from app.schemas.question import PracticeQuestionRead, QuestionRead


def active_collection_or_error(db: Session, collection_id: str | None, *, default_to_unfiled: bool = False) -> QuestionCollection:
    """返回一个可放置题目的活动集合；缺省位置统一归入未归类。"""

    resolved_id = collection_id or (UNFILED_COLLECTION_ID if default_to_unfiled else None)
    if not resolved_id:
        raise ValueError("必须指定集合")
    collection = db.get(QuestionCollection, resolved_id)
    if not collection or collection.is_deleted:
        raise ValueError("目标集合不存在或已删除")
    if collection.id == ROOT_COLLECTION_ID:
        raise ValueError("题库根目录不能直接存放题目，请选择具体集合或未归类")
    return collection


def collection_subtree_ids(
    db: Session,
    collection_id: str,
    *,
    include_descendants: bool = True,
    allow_deleted_root: bool = False,
) -> set[str]:
    """按父指针展开集合子树，供题库、回收站和练习使用。"""

    root = db.get(QuestionCollection, collection_id)
    if not root or (root.is_deleted and not allow_deleted_root):
        raise ValueError("集合不存在或已删除")
    if not include_descendants:
        return {root.id}
    children: dict[str | None, list[str]] = {}
    for item_id, parent_id in db.execute(select(QuestionCollection.id, QuestionCollection.parent_id)).all():
        children.setdefault(parent_id, []).append(item_id)
    result = {root.id}
    pending = [root.id]
    while pending:
        current = pending.pop()
        for child_id in children.get(current, []):
            if child_id not in result:
                result.add(child_id)
                pending.append(child_id)
    return result


def collection_path_map(db: Session) -> dict[str, str]:
    """构造稳定、可展示的根到叶路径，不因 N+1 查询拖慢题目列表。"""

    rows = list(db.scalars(select(QuestionCollection)).all())
    by_id = {item.id: item for item in rows}
    paths: dict[str, str] = {}

    def path_for(collection_id: str, seen: set[str] | None = None) -> str:
        if collection_id in paths:
            return paths[collection_id]
        item = by_id.get(collection_id)
        if not item:
            return ""
        seen = seen or set()
        if collection_id in seen:
            return item.name
        parent_path = path_for(item.parent_id, seen | {collection_id}) if item.parent_id else ""
        paths[collection_id] = f"{parent_path} / {item.name}" if parent_path else item.name
        return paths[collection_id]

    for collection_id in by_id:
        path_for(collection_id)
    return paths


def decorate_collection_paths(db: Session, questions: list[Question]) -> list[Question]:
    """为 ORM 题目临时附加 API 所需的 collection_path，不写库。"""

    paths = collection_path_map(db)
    for question in questions:
        question.collection_path = paths.get(question.collection_id or "") or None
    return questions


def question_read(db: Session, question: Question) -> QuestionRead:
    decorate_collection_paths(db, [question])
    return QuestionRead.model_validate(question)


def practice_question_read(db: Session, question: Question) -> PracticeQuestionRead:
    decorate_collection_paths(db, [question])
    return PracticeQuestionRead.model_validate(question)


def bulk_move_questions(db: Session, placements: list[tuple[str, str | None]]) -> list[str]:
    """全量校验后原子移动题目；位置变化不修改题目内容或版本。"""

    if not placements:
        raise ValueError("至少需要提供一条题目放置记录")
    question_ids = [question_id for question_id, _ in placements]
    if len(question_ids) != len(set(question_ids)):
        raise ValueError("同一题目不能在一次批量移动中出现多次")
    questions = {item.id: item for item in db.scalars(select(Question).where(Question.id.in_(question_ids))).all()}
    missing = [question_id for question_id in question_ids if question_id not in questions]
    if missing:
        raise ValueError(f"题目不存在：{missing[0]}")
    deleted = [question_id for question_id in question_ids if questions[question_id].is_deleted]
    if deleted:
        raise ValueError(f"已删除题目不能移动：{deleted[0]}")
    targets = {
        target_id: active_collection_or_error(db, target_id, default_to_unfiled=True).id
        for _, target_id in placements
    }
    for question_id, target_id in placements:
        questions[question_id].collection_id = targets[target_id]
    db.commit()
    return question_ids


def build_question_query(
    type: str | None = None,
    difficulty: str | None = None,
    tag: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    collection_id: str | None = None,
    include_descendants: bool = True,
    source_id: str | None = None,
    keyword: str | None = None,
    only_wrong: bool = False,
    include_deleted: bool = False,
    only_deleted: bool = False,
    db: Session | None = None,
) -> Select[tuple[Question]]:
    """集中构造题目筛选条件；source_id 仅保留为旧客户端兼容别名。"""

    query = select(Question)
    if only_deleted:
        query = query.where(Question.is_deleted.is_(True))
    elif not include_deleted:
        query = query.where(Question.is_deleted.is_(False))
    if type:
        query = query.where(or_(Question.type == type, Question.type_label == type))
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if collection_id:
        if db is None:
            raise ValueError("集合筛选需要数据库会话")
        ids = collection_subtree_ids(db, collection_id, include_descendants=include_descendants, allow_deleted_root=only_deleted)
        query = query.where(Question.collection_id.in_(ids))
    elif source_id:
        query = query.where(Question.source_id == source_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.where(or_(Question.stem.like(like), Question.explanation.like(like), Question.source_text.like(like)))
    if only_wrong:
        wrong_ids = select(Attempt.question_id).where(Attempt.is_correct.is_(False))
        query = query.where(Question.id.in_(wrong_ids))
    return query


def list_questions(db: Session, page: int, page_size: int, **filters: object) -> tuple[int, list[Question]]:
    """分页返回题目并装配集合路径。"""

    exam_point = filters.pop("exam_point", None)
    direction = filters.pop("direction", None)
    tag = filters.pop("tag", None)
    query = build_question_query(db=db, **filters)
    items = list(db.scalars(query.order_by(Question.import_order.asc().nulls_last(), Question.part_id)).all())
    if tag:
        items = [item for item in items if str(tag) in (item.tags or [])]
    if exam_point:
        items = [item for item in items if str(exam_point) in (item.exam_points or [])]
    if direction:
        items = [item for item in items if str(direction) in (item.directions or [])]
    total = len(items)
    return total, decorate_collection_paths(db, items[(page - 1) * page_size:page * page_size])


def get_random_question(
    db: Session,
    type: str | None = None,
    difficulty: str | None = None,
    tag: str | None = None,
    collection_id: str | None = None,
    include_descendants: bool = True,
    source_id: str | None = None,
    mode: str = "random",
) -> Question | None:
    """按练习模式抽取下一题，兼容旧 source_id 筛选。"""

    query = build_question_query(
        db=db,
        type=type,
        difficulty=difficulty,
        collection_id=collection_id,
        include_descendants=include_descendants,
        source_id=source_id,
        only_wrong=mode == "wrong_only",
    )
    items = list(db.scalars(query).all())
    if tag:
        items = [item for item in items if tag in (item.tags or [])]
    return random.choice(items) if items else None
