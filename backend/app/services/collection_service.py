"""集合树创建、移动、合并和精确软删除服务。"""

from __future__ import annotations

from datetime import datetime
import unicodedata
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.question_collection import (
    ROOT_COLLECTION_ID,
    UNFILED_COLLECTION_ID,
    CollectionDeletion,
    QuestionCollection,
)
from app.schemas.collection import CollectionCreate, CollectionDeletionRead, CollectionRead, CollectionUpdate
from app.services.question_revision_service import _build_revision, question_to_snapshot


class CollectionError(ValueError):
    """可稳定映射为集合 API 错误响应的领域异常。"""

    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code

    def detail(self) -> dict[str, str]:
        return {"code": self.code, "message": self.message}


def normalize_collection_name(name: str) -> str:
    return unicodedata.normalize("NFKC", name).strip().casefold()


def ensure_system_collections(db: Session) -> tuple[QuestionCollection, QuestionCollection]:
    """确保系统根和未归类节点存在；只 flush，调用方可以纳入自己的事务。"""

    root = db.get(QuestionCollection, ROOT_COLLECTION_ID)
    if root is None:
        root = QuestionCollection(
            id=ROOT_COLLECTION_ID,
            parent_id=None,
            name="题库",
            normalized_name=normalize_collection_name("题库"),
            description="系统根集合",
            is_system=True,
        )
        db.add(root)
        db.flush()
    unfiled = db.get(QuestionCollection, UNFILED_COLLECTION_ID)
    if unfiled is None:
        unfiled = QuestionCollection(
            id=UNFILED_COLLECTION_ID,
            parent_id=ROOT_COLLECTION_ID,
            name="未归类",
            normalized_name=normalize_collection_name("未归类"),
            description="无历史来源的题目",
            is_system=True,
        )
        db.add(unfiled)
        db.flush()
    return root, unfiled


def create_collection(db: Session, payload: CollectionCreate) -> CollectionRead:
    ensure_system_collections(db)
    name, normalized_name = _validated_name(payload.name)
    parent = _active_collection(db, payload.parent_id or ROOT_COLLECTION_ID)
    if parent.is_system and parent.id == UNFILED_COLLECTION_ID:
        raise CollectionError("SYSTEM_COLLECTION_PROTECTED", "不能在未归类集合下创建子集合", 409)
    collection = QuestionCollection(
        id=uuid4().hex,
        parent_id=parent.id,
        name=name,
        normalized_name=normalized_name,
        description=_validated_description(payload.description),
    )
    _commit(db, collection)
    return _read_collection(db, collection)


def get_collection_tree(db: Session) -> list[CollectionRead]:
    collections = list(
        db.scalars(
            select(QuestionCollection)
            .where(QuestionCollection.is_deleted.is_(False))
            .order_by(QuestionCollection.created_at, QuestionCollection.id)
        ).all()
    )
    direct_question_counts = dict(
        db.execute(
            select(Question.collection_id, func.count(Question.id))
            .where(Question.is_deleted.is_(False), Question.collection_id.is_not(None))
            .group_by(Question.collection_id)
        ).all()
    )
    by_parent: dict[str | None, list[QuestionCollection]] = {}
    for collection in collections:
        by_parent.setdefault(collection.parent_id, []).append(collection)

    paths = _collection_paths(db, include_deleted=False)

    def build(node: QuestionCollection) -> CollectionRead:
        children = [build(child) for child in by_parent.get(node.id, [])]
        return CollectionRead(
            id=node.id,
            parent_id=node.parent_id,
            name=node.name,
            description=node.description,
            path=paths.get(node.id, node.name),
            is_system=node.is_system,
            is_deleted=node.is_deleted,
            direct_question_count=int(direct_question_counts.get(node.id, 0)),
            total_question_count=int(direct_question_counts.get(node.id, 0)) + sum(child.total_question_count for child in children),
            children=children,
            created_at=node.created_at,
            updated_at=node.updated_at,
        )

    return [build(node) for node in by_parent.get(None, [])]


def list_deleted_collections(db: Session) -> list[CollectionRead]:
    """返回尚可精确恢复的删除批次根节点，每项附带 deletion_id。"""

    paths = _collection_paths(db, include_deleted=True)
    deletions = list(
        db.scalars(
            select(CollectionDeletion)
            .where(CollectionDeletion.restored_at.is_(None))
            .order_by(CollectionDeletion.created_at.desc(), CollectionDeletion.id.desc())
        ).all()
    )
    items: list[CollectionRead] = []
    for deletion in deletions:
        root = db.get(QuestionCollection, deletion.root_collection_id)
        if root is None or root.collection_deletion_id != deletion.id:
            continue
        restorable_questions = [
            question
            for question_id in deletion.question_ids
            if (question := db.get(Question, question_id)) is not None
            and question.collection_deletion_id == deletion.id
        ]
        direct_count = sum(
            1
            for question in restorable_questions
            if question.collection_id == root.id
        )
        items.append(
            CollectionRead(
                id=root.id,
                parent_id=root.parent_id,
                name=root.name,
                description=root.description,
                path=paths.get(root.id, root.name),
                is_system=root.is_system,
                is_deleted=True,
                deletion_id=deletion.id,
                direct_question_count=direct_count,
                total_question_count=len(restorable_questions),
                children=[],
                created_at=root.created_at,
                updated_at=root.updated_at,
            )
        )
    return items


def update_collection(db: Session, collection_id: str, payload: CollectionUpdate) -> CollectionRead:
    collection = _active_collection(db, collection_id)
    _ensure_mutable(collection)
    if payload.name is not None:
        collection.name, collection.normalized_name = _validated_name(payload.name)
    if "description" in payload.model_fields_set:
        collection.description = _validated_description(payload.description)
    _commit(db, collection)
    return _read_collection(db, collection)


def move_collection(db: Session, collection_id: str, parent_id: str | None) -> CollectionRead:
    collection = _active_collection(db, collection_id)
    target_parent = _active_collection(db, parent_id or ROOT_COLLECTION_ID)
    _ensure_mutable(collection)
    if target_parent.id == UNFILED_COLLECTION_ID:
        raise CollectionError("SYSTEM_COLLECTION_PROTECTED", "不能移动到未归类集合下", 409)
    if target_parent.id == collection.id:
        raise CollectionError("COLLECTION_MOVE_TO_SELF", "集合不能移动到自身", 400)
    descendant_ids = set(_subtree_ids(db, collection.id, include_deleted=True))
    if target_parent.id in descendant_ids:
        raise CollectionError("COLLECTION_CYCLE", "不能移动到自己的子集合", 409)
    collection.parent_id = target_parent.id
    _commit(db, collection)
    return _read_collection(db, collection)


def merge_collection(db: Session, source_id: str, target_id: str) -> CollectionRead:
    source = _active_collection(db, source_id)
    target = _active_collection(db, target_id)
    _ensure_mutable(source)
    _ensure_mutable(target)
    if source.id == target.id:
        raise CollectionError("SAME_COLLECTION", "不能合并到自身", 400)
    if target.id in set(_subtree_ids(db, source.id, include_deleted=True)):
        raise CollectionError("COLLECTION_CYCLE", "不能合并到自身或子集合", 409)
    try:
        _merge_into(db, source, target)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise CollectionError("COLLECTION_NAME_CONFLICT", "合并后存在同名集合冲突", 409) from exc
    db.refresh(target)
    return _read_collection(db, target)


def delete_collection_tree(db: Session, collection_id: str, reason: str | None = None) -> CollectionDeletionRead:
    root = _active_collection(db, collection_id)
    _ensure_mutable(root)
    collection_ids = _subtree_ids(db, root.id)
    deletion = CollectionDeletion(
        id=uuid4().hex,
        root_collection_id=root.id,
        collection_ids=collection_ids,
        question_ids=[],
        reason=reason.strip() if reason else None,
    )
    try:
        db.add(deletion)
        db.flush()
        questions = list(
            db.scalars(
                select(Question).where(Question.collection_id.in_(collection_ids), Question.is_deleted.is_(False))
            ).all()
        )
        now = datetime.now()
        for collection in db.scalars(select(QuestionCollection).where(QuestionCollection.id.in_(collection_ids))).all():
            collection.is_deleted = True
            collection.deleted_at = now
            collection.collection_deletion_id = deletion.id
        for question in questions:
            before_data = _question_snapshot(question)
            question.is_deleted = True
            question.deleted_at = now
            question.delete_reason = reason.strip() if reason else None
            question.deleted_source = "collection_delete"
            question.collection_deletion_id = deletion.id
            question.updated_at = now
            db.add(
                _build_revision(
                    question.id,
                    before_data,
                    _question_snapshot(question),
                    ["is_deleted", "deleted_at", "delete_reason", "collection_deletion_id"],
                    reason.strip() if reason else None,
                    "collection_delete",
                )
            )
        deletion.question_ids = [question.id for question in questions]
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(deletion)
    return _read_deletion(deletion)


def restore_collection_tree(db: Session, deletion_id: str) -> CollectionDeletionRead:
    deletion = db.get(CollectionDeletion, deletion_id)
    if deletion is None:
        raise CollectionError("COLLECTION_DELETION_NOT_FOUND", "集合删除记录不存在", 404)
    if deletion.restored_at is not None:
        raise CollectionError("COLLECTION_DELETION_ALREADY_RESTORED", "该集合删除记录已恢复", 409)
    root = db.get(QuestionCollection, deletion.root_collection_id)
    parent = db.get(QuestionCollection, root.parent_id) if root and root.parent_id else None
    if parent is not None and parent.is_deleted and parent.id not in deletion.collection_ids:
        raise CollectionError(
            "COLLECTION_PARENT_DELETED",
            "原父集合仍在回收站，请先恢复父集合，再恢复这个子集合",
            409,
        )
    try:
        collections = list(
            db.scalars(
                select(QuestionCollection).where(
                    QuestionCollection.id.in_(deletion.collection_ids),
                    QuestionCollection.collection_deletion_id == deletion.id,
                )
            ).all()
        )
        questions = list(
            db.scalars(
                select(Question).where(
                    Question.id.in_(deletion.question_ids),
                    Question.collection_deletion_id == deletion.id,
                )
            ).all()
        )
        for collection in collections:
            collection.is_deleted = False
            collection.deleted_at = None
            collection.collection_deletion_id = None
        for question in questions:
            before_data = _question_snapshot(question)
            question.is_deleted = False
            question.deleted_at = None
            question.delete_reason = None
            question.deleted_source = None
            question.collection_deletion_id = None
            question.updated_at = datetime.now()
            db.add(
                _build_revision(
                    question.id,
                    before_data,
                    _question_snapshot(question),
                    ["is_deleted", "deleted_at", "delete_reason", "collection_deletion_id"],
                    deletion.reason,
                    "collection_restore",
                )
            )
        deletion.restored_at = datetime.now()
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(deletion)
    return _read_deletion(deletion)


def _merge_into(db: Session, source: QuestionCollection, target: QuestionCollection) -> None:
    for question in db.scalars(select(Question).where(Question.collection_id == source.id)).all():
        question.collection_id = target.id
    children = list(
        db.scalars(
            select(QuestionCollection).where(
                QuestionCollection.parent_id == source.id,
                QuestionCollection.is_deleted.is_(False),
            )
        ).all()
    )
    for child in children:
        matching = db.scalar(
            select(QuestionCollection).where(
                QuestionCollection.parent_id == target.id,
                QuestionCollection.normalized_name == child.normalized_name,
                QuestionCollection.is_deleted.is_(False),
            )
        )
        if matching is None:
            child.parent_id = target.id
        else:
            _merge_into(db, child, matching)
    source.is_deleted = True
    source.deleted_at = datetime.now()


def _subtree_ids(db: Session, root_id: str, include_deleted: bool = False) -> list[str]:
    pending = [root_id]
    found: list[str] = []
    while pending:
        current_id = pending.pop()
        if current_id in found:
            continue
        found.append(current_id)
        query = select(QuestionCollection.id).where(QuestionCollection.parent_id == current_id)
        if not include_deleted:
            query = query.where(QuestionCollection.is_deleted.is_(False))
        pending.extend(db.scalars(query).all())
    return found


def _active_collection(db: Session, collection_id: str) -> QuestionCollection:
    collection = db.get(QuestionCollection, collection_id)
    if collection is None or collection.is_deleted:
        raise CollectionError("COLLECTION_NOT_FOUND", "集合不存在或已删除", 404)
    return collection


def _ensure_mutable(collection: QuestionCollection) -> None:
    if collection.is_system:
        raise CollectionError("SYSTEM_COLLECTION_PROTECTED", "系统集合不能修改、移动、合并或删除", 409)


def _validated_name(raw: str) -> tuple[str, str]:
    name = unicodedata.normalize("NFKC", raw or "").strip()
    if not name:
        raise CollectionError("COLLECTION_NAME_INVALID", "集合名称不能为空", 400)
    if len(name) > 255:
        raise CollectionError("COLLECTION_NAME_INVALID", "集合名称不能超过 255 个字符", 400)
    return name, normalize_collection_name(name)


def _validated_description(description: str | None) -> str | None:
    if description is None:
        return None
    result = description.strip()
    if len(result) > 1000:
        raise CollectionError("COLLECTION_DESCRIPTION_INVALID", "集合描述不能超过 1000 个字符", 400)
    return result or None


def _commit(db: Session, instance: QuestionCollection) -> None:
    try:
        db.add(instance)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise CollectionError("COLLECTION_NAME_CONFLICT", "同一父集合下已存在同名集合", 409) from exc
    db.refresh(instance)


def _read_collection(db: Session, collection: QuestionCollection) -> CollectionRead:
    count = db.scalar(
        select(func.count(Question.id)).where(Question.collection_id == collection.id, Question.is_deleted.is_(False))
    ) or 0
    return CollectionRead(
        id=collection.id,
        parent_id=collection.parent_id,
        name=collection.name,
        description=collection.description,
        path=_collection_paths(db, include_deleted=collection.is_deleted).get(collection.id, collection.name),
        is_system=collection.is_system,
        is_deleted=collection.is_deleted,
        direct_question_count=int(count),
        total_question_count=_total_question_count(db, collection.id),
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


def _total_question_count(db: Session, collection_id: str) -> int:
    ids = _subtree_ids(db, collection_id)
    return int(
        db.scalar(
            select(func.count(Question.id)).where(Question.collection_id.in_(ids), Question.is_deleted.is_(False))
        )
        or 0
    )


def _question_snapshot(question: Question) -> dict[str, object]:
    """补齐旧快照工具尚未覆盖的集合删除字段，保证 collection revision 可审计。"""

    return {
        **question_to_snapshot(question),
        "collection_id": question.collection_id,
        "collection_deletion_id": question.collection_deletion_id,
    }


def _collection_paths(db: Session, *, include_deleted: bool) -> dict[str, str]:
    query = select(QuestionCollection)
    if not include_deleted:
        query = query.where(QuestionCollection.is_deleted.is_(False))
    by_id = {item.id: item for item in db.scalars(query).all()}
    paths: dict[str, str] = {}

    def path_for(collection_id: str, seen: set[str] | None = None) -> str:
        if collection_id in paths:
            return paths[collection_id]
        node = by_id.get(collection_id)
        if node is None:
            return ""
        seen = seen or set()
        if collection_id in seen:
            return node.name
        parent_path = path_for(node.parent_id, seen | {collection_id}) if node.parent_id else ""
        paths[collection_id] = f"{parent_path} / {node.name}" if parent_path else node.name
        return paths[collection_id]

    for collection_id in by_id:
        path_for(collection_id)
    return paths


def _read_deletion(deletion: CollectionDeletion) -> CollectionDeletionRead:
    return CollectionDeletionRead(
        id=deletion.id,
        root_collection_id=deletion.root_collection_id,
        collection_ids=deletion.collection_ids or [],
        question_ids=deletion.question_ids or [],
        reason=deletion.reason,
        restored_at=deletion.restored_at,
        created_at=deletion.created_at,
    )
