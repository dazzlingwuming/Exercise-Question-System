"""中文说明：覆盖题目软删除、恢复和默认查询过滤。"""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.attempt import Attempt
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.schemas.practice import PracticeSessionCreate
from app.services.attempt_service import submit_answer
from app.services.practice_service import build_practice_questions
from app.services.practice_session_service import create_practice_session
from app.services.question_delete_service import restore_deleted_question, soft_delete_question
from app.services.question_service import list_questions
from app.services.stats_service import get_stats_summary
from app.services.wrong_question_service import list_wrong_questions


def make_db() -> Session:
    """中文说明：构造软删除测试数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    db.add_all(
        [
            make_question("q1", 1, ["工作流 Agent"], ["安全权限"]),
            make_question("q2", 2, ["RAG"], ["上下文工程"]),
            make_question("q3", 3, ["工作流 Agent"], ["上下文工程"]),
        ]
    )
    db.commit()
    return db


def make_question(id: str, order: int, directions: list[str], exam_points: list[str]) -> Question:
    """中文说明：构造一道测试选择题。"""

    return Question(
        id=id,
        part_id=f"Part-delete-{order:03d}",
        title=id,
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=["tag"],
        directions=directions,
        import_order=order,
        stem=f"题干 {id}",
        material=None,
        options=[{"key": "A", "text": "A"}, {"key": "B", "text": "B"}],
        standard_answer="A",
        answer_text="A",
        explanation="解析",
        exam_points=exam_points,
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard="1",
        source_text="source",
        parse_warnings=[],
        version=1,
    )


def test_soft_delete_records_status_reason_time_and_revision() -> None:
    """中文说明：软删除会设置删除字段并生成 revision。"""

    db = make_db()
    question = db.get(Question, "q1")
    deleted = soft_delete_question(db, question, "题目重复")
    revisions = db.scalars(select(QuestionRevision).where(QuestionRevision.question_id == "q1")).all()
    assert deleted.is_deleted is True
    assert deleted.deleted_at is not None
    assert deleted.delete_reason == "题目重复"
    assert deleted.deleted_source == "manual_delete"
    assert revisions[-1].source == "manual_delete"
    assert "is_deleted" in revisions[-1].changed_fields


def test_repeated_delete_returns_reasonable_error() -> None:
    """中文说明：重复删除返回明确错误。"""

    db = make_db()
    question = db.get(Question, "q1")
    soft_delete_question(db, question, "题目重复")
    with pytest.raises(ValueError, match="已删除"):
        soft_delete_question(db, question, "再次删除")


def test_restore_deleted_question_and_revision() -> None:
    """中文说明：恢复题目会清空删除字段并生成恢复 revision。"""

    db = make_db()
    question = db.get(Question, "q1")
    soft_delete_question(db, question, "题目重复")
    restored = restore_deleted_question(db, question, "误删")
    revisions = db.scalars(select(QuestionRevision).where(QuestionRevision.question_id == "q1")).all()
    assert restored.is_deleted is False
    assert restored.deleted_at is None
    assert restored.delete_reason is None
    assert revisions[-1].source == "restore_deleted_question"


def test_question_list_default_excludes_deleted_and_only_deleted_returns_deleted() -> None:
    """中文说明：题库列表默认排除已删除题，only_deleted 只返回回收站题。"""

    db = make_db()
    soft_delete_question(db, db.get(Question, "q1"), "题目重复")
    total, items = list_questions(db, 1, 20)
    deleted_total, deleted_items = list_questions(db, 1, 20, only_deleted=True)
    assert total == 2
    assert [item.id for item in items] == ["q2", "q3"]
    assert deleted_total == 1
    assert [item.id for item in deleted_items] == ["q1"]
    assert db.get(Question, "q1").is_deleted is True


def test_practice_queries_and_sessions_exclude_deleted_questions() -> None:
    """中文说明：顺序、随机和 session 创建都不包含已删除题。"""

    db = make_db()
    soft_delete_question(db, db.get(Question, "q2"), "题目重复")
    sequential = build_practice_questions(db, mode="sequential", page_size=20)
    random_result = build_practice_questions(db, mode="random", order="random", page_size=20)
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    assert "q2" not in [item.id for item in sequential.items]
    assert "q2" not in [item.id for item in random_result.items]
    assert "q2" not in [item.id for item in session.items]


def test_wrong_questions_and_stats_exclude_deleted_but_keep_attempts() -> None:
    """中文说明：错题和统计排除已删除题，但旧 attempt 不删除。"""

    db = make_db()
    submit_answer(db, db.get(Question, "q1"), "B")
    submit_answer(db, db.get(Question, "q2"), "B")
    soft_delete_question(db, db.get(Question, "q1"), "题目重复")
    wrong_page = list_wrong_questions(db)
    stats = get_stats_summary(db)
    attempts = db.scalars(select(Attempt)).all()
    assert [row.question.id for row in wrong_page.items] == ["q2"]
    assert stats.total_questions == 2
    assert stats.wrong_count == 1
    assert len(attempts) == 2


def test_deleted_question_cannot_submit_answer() -> None:
    """中文说明：已删除题不能继续提交答案。"""

    db = make_db()
    question = db.get(Question, "q1")
    soft_delete_question(db, question, "题目重复")
    with pytest.raises(ValueError, match="已删除"):
        submit_answer(db, question, "A")
