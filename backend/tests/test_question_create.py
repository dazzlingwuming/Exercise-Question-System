"""中文说明：覆盖页面手动新增题目功能。"""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.question_revision import QuestionRevision
from app.schemas.practice import PracticeSessionCreate
from app.schemas.question import OptionSchema, QuestionCreate
from app.services.practice_session_service import create_practice_session
from app.services.question_create_service import create_question
from app.services.question_service import list_questions
from app.services.question_validation_service import QuestionValidationError


def make_db() -> Session:
    """中文说明：构造手动新增题目的测试数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def test_create_single_choice_question_success() -> None:
    """中文说明：可以手动新增单选题，并生成基础字段和创建历史。"""

    db = make_db()
    question = create_question(db, single_choice_payload())
    revision = db.scalar(select(QuestionRevision).where(QuestionRevision.question_id == question.id))
    assert question.id.startswith("manual_")
    assert question.part_id == "Manual-000001"
    assert question.import_order == 1
    assert question.version == 1
    assert question.is_deleted is False
    assert revision.source == "manual_create"
    assert revision.version_before == 0
    assert revision.changed_fields == ["created"]


def test_create_multiple_choice_and_subjective_success() -> None:
    """中文说明：可以手动新增多选题和主观题。"""

    db = make_db()
    multiple = create_question(
        db,
        QuestionCreate(
            type="multiple_choice",
            difficulty="3",
            stem="哪些正确？",
            options=[OptionSchema(key="A", text="正确"), OptionSchema(key="B", text="正确"), OptionSchema(key="C", text="错误")],
            standard_answer="A、B",
            explanation="A 和 B 正确。",
        ),
    )
    subjective = create_question(
        db,
        QuestionCreate(
            type="system_design",
            difficulty="5",
            stem="设计一个 Agent 平台。",
            standard_answer="需要覆盖网关、编排、状态和工具。",
            scoring_standard="覆盖关键模块即可。",
        ),
    )
    assert multiple.part_id == "Manual-000001"
    assert subjective.part_id == "Manual-000002"
    assert subjective.type_label == "系统设计题"


def test_create_question_validation_errors() -> None:
    """中文说明：题干、答案和选项错误会被拒绝。"""

    db = make_db()
    with pytest.raises(QuestionValidationError, match="题干不能为空"):
        create_question(db, QuestionCreate(type="single_choice", stem="", options=[OptionSchema(key="A", text="A")], standard_answer="A"))
    with pytest.raises(QuestionValidationError, match="单选题标准答案"):
        create_question(db, single_choice_payload(answer="C"))
    with pytest.raises(QuestionValidationError, match="主观题至少"):
        create_question(db, QuestionCreate(type="system_design", stem="设计系统", standard_answer=""))


def test_created_question_visible_in_list_unanswered_and_practice_session() -> None:
    """中文说明：新增题目进入题库列表、未答题练习和 Practice Session。"""

    db = make_db()
    question = create_question(db, single_choice_payload())
    total, items = list_questions(db, 1, 20)
    session = create_practice_session(db, PracticeSessionCreate(mode="unanswered", page_size=20))
    assert total == 1
    assert items[0].id == question.id
    assert session.items[0].id == question.id


def test_create_unsupported_type_failed() -> None:
    """中文说明：不支持未知题型。"""

    db = make_db()
    with pytest.raises(ValueError, match="不支持"):
        create_question(db, QuestionCreate(type="unknown_new", stem="题干", standard_answer="答案"))


def single_choice_payload(answer: str = "B") -> QuestionCreate:
    return QuestionCreate(
        type="single_choice",
        difficulty="2",
        tags=["手动新增"],
        directions=["Tool Calling"],
        stem="下面哪项正确？",
        options=[OptionSchema(key="A", text="错误"), OptionSchema(key="B", text="正确")],
        standard_answer=answer,
        explanation="B 正确。",
        exam_points=["工具调用"],
        reason="手动补充",
    )
