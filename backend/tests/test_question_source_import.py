"""覆盖稳定来源与导入批次分离、同名追加复用及历史安全回填。"""

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import database
from app.database import Base
from app.models.import_batch import ImportBatch
from app.models.question import Question
from app.models.question_source import QuestionSource
from app.services.import_service import commit_import


V2_A = """<!-- question-bank-format: v2 -->

--- question ---
question_id: source_a_001
type: single_choice
difficulty: 2
stem: |
  来源 A 的题目。
options:
  A: 错
  B: 对
answer: B
"""

V2_B = V2_A.replace("source_a_001", "source_b_001").replace("来源 A", "来源 B")


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_same_normalized_source_reuses_one_source_and_links_questions_and_batches() -> None:
    db = _session()

    first = commit_import(db, V2_A, "  课程 A  ")
    second = commit_import(db, V2_B, "课程 a")

    sources = db.scalars(select(QuestionSource)).all()
    batches = db.scalars(select(ImportBatch).order_by(ImportBatch.created_at, ImportBatch.id)).all()
    questions = db.scalars(select(Question).order_by(Question.id)).all()
    assert first.imported_count == second.imported_count == 1
    assert len(sources) == 1
    assert sources[0].name == "课程 A"
    assert {batch.source_id for batch in batches} == {sources[0].id}
    assert {question.source_id for question in questions} == {sources[0].id}
    assert questions[0].source_name == "课程 A"


def test_backfill_only_assigns_questions_when_one_batch_count_matches(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    commit_import(db, V2_A, "Mage-VL-论文精读题库-v2.md")
    db.query(Question).update({Question.source_id: None})
    db.query(ImportBatch).update({ImportBatch.source_id: None})
    db.commit()
    monkeypatch.setattr(database, "engine", engine)

    database.backfill_question_sources()
    database.backfill_question_sources()

    source = db.scalars(select(QuestionSource)).one()
    assert db.scalars(select(ImportBatch.source_id)).one() == source.id
    assert db.scalars(select(Question.source_id)).one() == source.id
    assert db.query(QuestionSource).count() == 1


def test_backfill_does_not_guess_question_source_for_multiple_batches(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    commit_import(db, V2_A, "来源 A")
    commit_import(db, V2_B, "来源 B")
    db.query(Question).update({Question.source_id: None})
    db.query(ImportBatch).update({ImportBatch.source_id: None})
    db.commit()
    monkeypatch.setattr(database, "engine", engine)

    database.backfill_question_sources()

    assert db.query(QuestionSource).count() == 2
    assert db.scalars(select(Question.source_id)).all() == [None, None]
    assert all(source_id is not None for source_id in db.scalars(select(ImportBatch.source_id)).all())
