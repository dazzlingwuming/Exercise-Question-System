"""覆盖 collection 到题目创建、导入、筛选、练习、移动与恢复的接线。"""

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.import_batch import ImportBatch
from app.models.question import Question
from app.models.question_collection import QuestionCollection, ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID
from app.schemas.practice import PracticeSessionCreate
from app.schemas.question import OptionSchema, QuestionCreate
from app.services.collection_service import ensure_system_collections
from app.services.import_service import commit_import
from app.services.practice_session_service import create_practice_session, get_practice_session
from app.services.question_create_service import create_question
from app.services.question_delete_service import restore_deleted_question, soft_delete_question
from app.services.question_service import bulk_move_questions, list_questions, question_read


V2 = """<!-- question-bank-format: v2 -->

--- question ---
question_id: q_collection_import_001
type: single_choice
difficulty: 2
tags:
  - collection
directions:
  - 基础
exam_points:
  - 导入
stem: |
  请选择正确项。
options:
  A: 错
  B: 对
answer: B
explanation: |
  B 正确。
"""


def make_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    ensure_system_collections(db)
    db.add_all(
        [
            QuestionCollection(id="collection_parent", parent_id=ROOT_COLLECTION_ID, name="父集合", normalized_name="父集合"),
            QuestionCollection(id="collection_child", parent_id="collection_parent", name="子集合", normalized_name="子集合"),
            QuestionCollection(id="collection_other", parent_id=ROOT_COLLECTION_ID, name="其他", normalized_name="其他"),
        ]
    )
    db.commit()
    return db


def payload(collection_id: str | None = None) -> QuestionCreate:
    return QuestionCreate(
        type="single_choice",
        difficulty="2",
        stem="下面哪项正确？",
        options=[OptionSchema(key="A", text="错误"), OptionSchema(key="B", text="正确")],
        standard_answer="B",
        explanation="B 正确。",
        collection_id=collection_id,
    )


def test_create_defaults_to_unfiled_and_question_read_exposes_collection_path() -> None:
    db = make_db()
    question = create_question(db, payload())

    read = question_read(db, question)
    assert question.collection_id == UNFILED_COLLECTION_ID
    assert read.collection_id == UNFILED_COLLECTION_ID
    assert read.collection_path == "题库 / 未归类"


def test_import_persists_batch_name_and_selected_collection() -> None:
    db = make_db()
    result = commit_import(db, V2, batch_name="导入批次.md", collection_id="collection_child")
    batch = db.get(ImportBatch, result.batch_id)
    question = db.get(Question, "q_collection_import_001")

    assert batch.source_name == "导入批次.md"
    assert batch.collection_id == question.collection_id == "collection_child"
    assert question.source_id is None


def test_collection_filters_include_descendants_and_session_keeps_path_snapshot() -> None:
    db = make_db()
    child = create_question(db, payload("collection_child"))
    other = create_question(db, payload("collection_other"))

    total, subtree = list_questions(db, 1, 20, collection_id="collection_parent")
    direct_total, direct = list_questions(db, 1, 20, collection_id="collection_parent", include_descendants=False)
    session = create_practice_session(
        db,
        PracticeSessionCreate(mode="all_practice", collection_id="collection_parent", page_size=20),
    )
    restored = get_practice_session(db, session.session_id)

    assert total == 1 and [item.id for item in subtree] == [child.id]
    assert direct_total == 0 and direct == []
    assert other.id not in [item.id for item in session.items]
    assert session.items[0].collection_path == "题库 / 父集合 / 子集合"
    assert restored and restored.filters["collection_path_snapshot"] == "题库 / 父集合"


def test_bulk_move_validates_all_before_commit_and_does_not_bump_version() -> None:
    db = make_db()
    first = create_question(db, payload("collection_parent"))
    second = create_question(db, payload("collection_parent"))
    versions = {first.id: first.version, second.id: second.version}

    try:
        bulk_move_questions(db, [(first.id, "collection_other"), ("missing", "collection_other")])
    except ValueError:
        db.rollback()
    assert db.get(Question, first.id).collection_id == "collection_parent"

    moved = bulk_move_questions(db, [(first.id, "collection_other"), (second.id, None)])
    assert moved == [first.id, second.id]
    assert db.get(Question, first.id).collection_id == "collection_other"
    assert db.get(Question, second.id).collection_id == UNFILED_COLLECTION_ID
    assert {question_id: db.get(Question, question_id).version for question_id in versions} == versions


def test_restore_moves_to_unfiled_when_original_collection_is_inactive() -> None:
    db = make_db()
    question = create_question(db, payload("collection_child"))
    soft_delete_question(db, question, "测试")
    collection = db.get(QuestionCollection, "collection_child")
    collection.is_deleted = True
    db.commit()

    restored = restore_deleted_question(db, question, "恢复")
    assert restored.collection_id == UNFILED_COLLECTION_ID
    assert restored.is_deleted is False


def test_restore_honors_explicit_target_even_when_original_collection_is_active() -> None:
    db = make_db()
    question = create_question(db, payload("collection_child"))
    soft_delete_question(db, question, "测试")

    restored = restore_deleted_question(db, question, "调整归档后恢复", target_collection_id="collection_other")

    assert restored.collection_id == "collection_other"
    assert restored.is_deleted is False
