"""覆盖导入批次名称与集合归属分离。"""

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.import_batch import ImportBatch
from app.models.question import Question
from app.services.import_service import commit_import
from app.models.question_collection import UNFILED_COLLECTION_ID


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


def test_import_uses_batch_name_and_links_questions_and_batches_to_unfiled() -> None:
    db = _session()

    first = commit_import(db, V2_A, "  课程 A  ")
    second = commit_import(db, V2_B, "课程 a")

    batches = db.scalars(select(ImportBatch).order_by(ImportBatch.created_at, ImportBatch.id)).all()
    questions = db.scalars(select(Question).order_by(Question.id)).all()
    assert first.imported_count == second.imported_count == 1
    assert {batch.source_name for batch in batches} == {"课程 A", "课程 a"}
    assert {batch.collection_id for batch in batches} == {UNFILED_COLLECTION_ID}
    assert {question.collection_id for question in questions} == {UNFILED_COLLECTION_ID}
    assert all(question.source_id is None for question in questions)
