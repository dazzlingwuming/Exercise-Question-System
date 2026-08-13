"""覆盖 v2 导入的全批次阻断和内容冲突策略。"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.import_batch import ImportBatch
from app.models.question import Question
from app.services.import_service import ImportValidationError, commit_import, preview_import


V2 = """<!-- question-bank-format: v2 -->

--- question ---
question_id: q_import_v2_001
type: single_choice
difficulty: 2
stem: |
  请选择正确项。
options:
  A: 错
  B: 对
answer: B
"""


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_v2_commit_blocks_parse_errors_before_writing() -> None:
    db = _session()

    with pytest.raises(ImportValidationError):
        commit_import(db, V2.replace("answer: B", "answer: C"), "bad-v2.md")

    assert db.query(Question).count() == 0


def test_v2_preview_and_commit_skip_same_but_block_changed_question() -> None:
    db = _session()
    first = commit_import(db, V2, "source-v2.md")
    same_preview = preview_import(text=V2, source_name="source-v2.md", db=db)

    assert first.imported_count == 1
    assert db.query(ImportBatch).one().format_version == "v2"
    assert same_preview.database_conflicts[0].status == "same"
    assert commit_import(db, V2, "source-v2.md").skipped_count == 1
    with pytest.raises(ImportValidationError):
        commit_import(db, V2.replace("answer: B", "answer: A"), "changed-v2.md")
