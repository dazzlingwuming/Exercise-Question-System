"""中文说明：覆盖第二阶段题目编辑、修改历史、恢复和答题快照。"""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.attempt import Attempt
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.schemas.question import QuestionUpdate
from app.services.attempt_service import submit_answer
from app.services.question_revision_service import list_revisions, restore_revision, update_question
from app.services.question_validation_service import QuestionValidationError, validate_question_for_save


@pytest.fixture()
def db() -> Session:
    """中文说明：使用内存 SQLite 隔离编辑测试，避免污染真实题库数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    session.add(make_question())
    session.commit()
    try:
        yield session
    finally:
        session.close()


def make_question() -> Question:
    """中文说明：构造一条可编辑单选题作为测试基准数据。"""

    return Question(
        id="q-edit-001",
        part_id="Part-edit-001",
        title="原题",
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=["高仿真题"],
        stem="原题干",
        material=None,
        options=[{"key": "A", "text": "错误"}, {"key": "B", "text": "正确"}],
        standard_answer="B",
        answer_text="B",
        explanation="原解析",
        exam_points=["工作流"],
        common_mistakes="原常见错误",
        follow_up_question="原追问",
        scoring_standard="1 分",
        source_text="source",
        parse_warnings=[],
        version=1,
    )


def test_update_stem_answer_and_explanation_creates_revision(db: Session) -> None:
    """中文说明：修改题干、标准答案和解析后版本递增并生成历史。"""

    question = db.get(Question, "q-edit-001")
    updated = update_question(
        db,
        question,
        QuestionUpdate(stem="新题干", standard_answer="A", explanation="新解析", reason="修正答案"),
    )
    revisions = db.scalars(select(QuestionRevision)).all()
    assert updated.version == 2
    assert updated.stem == "新题干"
    assert updated.standard_answer == "A"
    assert updated.explanation == "新解析"
    assert len(revisions) == 1
    assert set(revisions[0].changed_fields) >= {"stem", "standard_answer", "explanation"}


def test_single_choice_answer_must_be_existing_option(db: Session) -> None:
    """中文说明：单选题标准答案必须属于已有选项。"""

    with pytest.raises(QuestionValidationError):
        update_question(db, db.get(Question, "q-edit-001"), QuestionUpdate(standard_answer="C"))


def test_multiple_choice_answer_must_be_existing_options() -> None:
    """中文说明：多选题所有答案都必须属于已有选项集合。"""

    data = {
        "stem": "多选题",
        "type": "multiple_choice",
        "options": [{"key": "A", "text": "A"}, {"key": "B", "text": "B"}],
        "standard_answer": "A、C",
    }
    with pytest.raises(QuestionValidationError):
        validate_question_for_save(data)


def test_true_false_answer_must_be_valid() -> None:
    """中文说明：判断题答案必须能归一化为正确或错误。"""

    data = {"stem": "判断题", "type": "true_false", "options": [], "standard_answer": "也许"}
    with pytest.raises(QuestionValidationError):
        validate_question_for_save(data)


def test_option_key_cannot_duplicate() -> None:
    """中文说明：选项 key 不能重复。"""

    data = {
        "stem": "单选题",
        "type": "single_choice",
        "options": [{"key": "A", "text": "A"}, {"key": "A", "text": "重复"}],
        "standard_answer": "A",
    }
    with pytest.raises(QuestionValidationError):
        validate_question_for_save(data)


def test_get_revisions_and_restore(db: Session) -> None:
    """中文说明：可以查看历史并恢复到 revision 的修改前版本，恢复也会新增历史。"""

    question = db.get(Question, "q-edit-001")
    update_question(db, question, QuestionUpdate(stem="新题干", reason="测试恢复"))
    revision = list_revisions(db, question.id)[0]
    restored = restore_revision(db, question, revision, "before", "恢复旧题干")
    revisions = list_revisions(db, question.id)
    assert restored.stem == "原题干"
    assert restored.version == 3
    assert len(revisions) == 2
    assert revisions[0].source == "restore"


def test_new_answer_used_for_future_attempt_and_old_attempt_not_recomputed(db: Session) -> None:
    """中文说明：修改答案后新提交按新答案判分，旧记录保留原判分结果。"""

    question = db.get(Question, "q-edit-001")
    old_attempt_result = submit_answer(db, question, "B")
    old_attempt = db.get(Attempt, old_attempt_result.attempt_id)
    update_question(db, question, QuestionUpdate(standard_answer="A", reason="答案改为 A"))
    new_attempt_result = submit_answer(db, question, "B")
    new_attempt = db.get(Attempt, new_attempt_result.attempt_id)
    assert old_attempt.is_correct is True
    assert old_attempt.question_version == 1
    assert old_attempt.question_snapshot["standard_answer"] == "B"
    assert new_attempt.is_correct is False
    assert new_attempt.question_version == 2
    assert new_attempt.question_snapshot["standard_answer"] == "A"
