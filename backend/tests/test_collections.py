"""集合树的核心事务与精确恢复回归。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.models.question_collection import ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, QuestionCollection
from app.schemas.collection import CollectionCreate, CollectionUpdate
from app.services.collection_service import (
    CollectionError,
    create_collection,
    delete_collection_tree,
    get_collection_tree,
    list_deleted_collections,
    merge_collection,
    move_collection,
    restore_collection_tree,
    ensure_system_collections,
    update_collection,
)


def make_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    ensure_system_collections(db)
    db.commit()
    return db


def make_question(question_id: str, collection_id: str, deleted: bool = False) -> Question:
    return Question(
        id=question_id,
        part_id=question_id,
        title=question_id,
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=[],
        directions=[],
        import_order=1,
        collection_id=collection_id,
        stem=question_id,
        material=None,
        options=[{"key": "A", "text": "A"}],
        standard_answer="A",
        answer_text="A",
        explanation="解析",
        exam_points=[],
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard=None,
        source_text="test",
        parse_warnings=[],
        version=1,
        is_deleted=deleted,
    )


def test_create_tree_uses_normalized_sibling_uniqueness_and_system_protection() -> None:
    db = make_db()
    first = create_collection(db, CollectionCreate(name="  RAG  "))
    child = create_collection(db, CollectionCreate(name="检索", parent_id=first.id, description="  notes  "))
    assert first.parent_id == ROOT_COLLECTION_ID
    assert first.path == "题库 / RAG"
    assert child.description == "notes"
    try:
        create_collection(db, CollectionCreate(name="rag"))
    except CollectionError as exc:
        assert exc.code == "COLLECTION_NAME_CONFLICT"
    else:
        raise AssertionError("同父规范化重名应被拒绝")
    try:
        update_collection(db, ROOT_COLLECTION_ID, CollectionUpdate(name="不能改"))
    except CollectionError as exc:
        assert exc.code == "SYSTEM_COLLECTION_PROTECTED"
    else:
        raise AssertionError("系统节点应受保护")
    assert UNFILED_COLLECTION_ID in {item.id for item in get_collection_tree(db)[0].children}


def test_ensure_system_collections_is_idempotent_and_flushes() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    first_root, first_unfiled = ensure_system_collections(db)
    second_root, second_unfiled = ensure_system_collections(db)
    assert first_root.id == second_root.id == ROOT_COLLECTION_ID
    assert first_unfiled.id == second_unfiled.id == UNFILED_COLLECTION_ID
    assert db.get(QuestionCollection, ROOT_COLLECTION_ID) is not None
    assert db.get(QuestionCollection, UNFILED_COLLECTION_ID).parent_id == ROOT_COLLECTION_ID


def test_move_blocks_cycles_and_merge_recursively_moves_questions_and_children() -> None:
    db = make_db()
    source = create_collection(db, CollectionCreate(name="来源"))
    target = create_collection(db, CollectionCreate(name="目标"))
    source_child = create_collection(db, CollectionCreate(name="共同", parent_id=source.id))
    target_child = create_collection(db, CollectionCreate(name="共同", parent_id=target.id))
    db.add_all([make_question("source-direct", source.id), make_question("source-child", source_child.id)])
    db.commit()
    try:
        move_collection(db, source.id, source_child.id)
    except CollectionError as exc:
        assert exc.code == "COLLECTION_CYCLE"
    else:
        raise AssertionError("移动到后代应被拒绝")
    merge_collection(db, source.id, target.id)
    assert db.get(Question, "source-direct").collection_id == target.id
    assert db.get(Question, "source-child").collection_id == target_child.id
    assert db.get(QuestionCollection, source.id).is_deleted is True


def test_delete_marks_only_currently_active_questions_and_restore_is_exact() -> None:
    db = make_db()
    parent = create_collection(db, CollectionCreate(name="父"))
    child = create_collection(db, CollectionCreate(name="子", parent_id=parent.id))
    db.add_all(
        [
            make_question("active-parent", parent.id),
            make_question("active-child", child.id),
            make_question("already-deleted", child.id, deleted=True),
        ]
    )
    db.commit()
    deletion = delete_collection_tree(db, parent.id, "整理")
    assert set(deletion.collection_ids) == {parent.id, child.id}
    assert set(deletion.question_ids) == {"active-parent", "active-child"}
    assert db.get(Question, "active-parent").collection_deletion_id == deletion.id
    assert db.get(Question, "already-deleted").collection_deletion_id is None
    delete_revisions = db.query(QuestionRevision).filter(QuestionRevision.question_id.in_(["active-parent", "active-child"])).all()
    assert len(delete_revisions) == 2
    assert {revision.source for revision in delete_revisions} == {"collection_delete"}
    assert all(revision.changed_fields == ["is_deleted", "deleted_at", "delete_reason", "collection_deletion_id"] for revision in delete_revisions)
    assert all(revision.after_data["collection_deletion_id"] == deletion.id for revision in delete_revisions)
    deleted = list_deleted_collections(db)
    assert [(item.id, item.deletion_id, item.total_question_count) for item in deleted] == [(parent.id, deletion.id, 2)]
    restore_collection_tree(db, deletion.id)
    assert db.get(Question, "active-parent").is_deleted is False
    assert db.get(Question, "already-deleted").is_deleted is True
    revisions = db.query(QuestionRevision).filter(QuestionRevision.question_id.in_(["active-parent", "active-child"])).all()
    assert len(revisions) == 4
    assert [revision.source for revision in revisions].count("collection_restore") == 2
    assert all(
        revision.changed_fields == ["is_deleted", "deleted_at", "delete_reason", "collection_deletion_id"]
        for revision in revisions
        if revision.source == "collection_restore"
    )
    assert all(revision.after_data["collection_deletion_id"] is None for revision in revisions if revision.source == "collection_restore")
    try:
        restore_collection_tree(db, deletion.id)
    except CollectionError as exc:
        assert exc.code == "COLLECTION_DELETION_ALREADY_RESTORED"
    else:
        raise AssertionError("重复恢复应被拒绝")


def test_restore_requires_deleted_parent_to_be_restored_first() -> None:
    db = make_db()
    parent = create_collection(db, CollectionCreate(name="父"))
    child = create_collection(db, CollectionCreate(name="子", parent_id=parent.id))

    child_deletion = delete_collection_tree(db, child.id)
    parent_deletion = delete_collection_tree(db, parent.id)

    try:
        restore_collection_tree(db, child_deletion.id)
    except CollectionError as exc:
        assert exc.code == "COLLECTION_PARENT_DELETED"
    else:
        raise AssertionError("父集合仍被删除时，不应把子集合恢复到不可见位置")

    restore_collection_tree(db, parent_deletion.id)
    restore_collection_tree(db, child_deletion.id)
    assert db.get(QuestionCollection, parent.id).is_deleted is False
    assert db.get(QuestionCollection, child.id).is_deleted is False
