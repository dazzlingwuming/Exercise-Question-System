"""中文说明：覆盖第三阶段练习模式、方向字段和错题分页。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.question import QuestionUpdate
from app.services.attempt_service import submit_answer
from app.services.direction_service import normalize_directions
from app.services.practice_service import build_practice_questions, get_next_practice_question
from app.services.question_revision_service import update_question
from app.services.wrong_question_service import list_wrong_questions


def make_db() -> Session:
    """中文说明：构造包含不同顺序、方向、考察点和答题状态的测试数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    db.add_all(
        [
            make_question("q1", 1, "single_choice", "基础", ["工作流 Agent"], ["工作流 Agent"], "A"),
            make_question("q2", 2, "multiple_choice", "进阶", ["RAG"], ["上下文工程"], "A、B"),
            make_question("q3", 3, "true_false", "基础", ["安全权限"], ["安全权限"], "正确"),
        ]
    )
    db.commit()
    return db


def make_question(
    id: str,
    order: int,
    type: str,
    difficulty: str,
    directions: list[str],
    exam_points: list[str],
    answer: str,
) -> Question:
    """中文说明：构造练习模式测试题。"""

    return Question(
        id=id,
        part_id=f"Part-test-{order:03d}",
        title=id,
        type=type,
        type_label=type,
        difficulty=difficulty,
        tags=["tag"],
        directions=directions,
        import_order=order,
        stem=f"题干 {id}",
        material=None,
        options=[{"key": "A", "text": "A"}, {"key": "B", "text": "B"}],
        standard_answer=answer,
        answer_text=answer,
        explanation="解析",
        exam_points=exam_points,
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard="1",
        source_text="source",
        parse_warnings=[],
        version=1,
    )


def test_normalize_directions() -> None:
    """中文说明：directions 支持多种分隔符并去重保序。"""

    assert normalize_directions("工作流 Agent、RAG/RAG,安全权限") == ["工作流 Agent", "RAG", "安全权限"]


def test_sequential_mode_orders_by_import_order() -> None:
    """中文说明：按导入顺序练习应按 import_order 返回。"""

    db = make_db()
    result = build_practice_questions(db, mode="sequential")
    assert [item.id for item in result.items] == ["q1", "q2", "q3"]


def test_direction_and_exam_point_filters() -> None:
    """中文说明：方向专项和考察点专项能正确筛选题目。"""

    db = make_db()
    by_direction = build_practice_questions(db, mode="direction", direction="工作流 Agent")
    by_exam_point = build_practice_questions(db, mode="exam_point", exam_point="上下文工程")
    assert [item.id for item in by_direction.items] == ["q1"]
    assert [item.id for item in by_exam_point.items] == ["q2"]


def test_unanswered_mode_excludes_answered_questions() -> None:
    """中文说明：未答题模式排除已有 attempt 的题目。"""

    db = make_db()
    submit_answer(db, db.get(Question, "q1"), "A")
    result = build_practice_questions(db, mode="unanswered")
    assert [item.id for item in result.items] == ["q2", "q3"]


def test_wrong_mode_and_start_question_id() -> None:
    """中文说明：错题专项只返回错题，并支持从指定错题开始。"""

    db = make_db()
    submit_answer(db, db.get(Question, "q1"), "B")
    submit_answer(db, db.get(Question, "q2"), "A")
    result = build_practice_questions(db, mode="wrong", start_question_id="q2")
    assert [item.id for item in result.items] == ["q2", "q1"]


def test_wrong_question_pagination_and_filters() -> None:
    """中文说明：错题列表支持分页、题型筛选和方向筛选。"""

    db = make_db()
    submit_answer(db, db.get(Question, "q1"), "B")
    submit_answer(db, db.get(Question, "q3"), "错误")
    page = list_wrong_questions(db, page=1, page_size=1)
    by_type = list_wrong_questions(db, type="true_false")
    by_direction = list_wrong_questions(db, direction="工作流 Agent")
    assert page.total == 2
    assert page.has_next is True
    assert [row.question.id for row in by_type.items] == ["q3"]
    assert [row.question.id for row in by_direction.items] == ["q1"]


def test_next_question_in_sequential_mode() -> None:
    """中文说明：顺序练习下一题按 import_order 推进。"""

    db = make_db()
    next_question = get_next_practice_question(db, mode="sequential", current_question_id="q1")
    assert next_question.id == "q2"


def test_update_directions_creates_revision_and_supports_practice() -> None:
    """中文说明：修改 directions 会进入 revision，且新方向可用于专项练习。"""

    db = make_db()
    question = db.get(Question, "q1")
    update_question(db, question, QuestionUpdate(directions=["生产排障"], reason="调整方向"))
    result = build_practice_questions(db, mode="direction", direction="生产排障")
    assert question.version == 2
    assert result.items[0].id == "q1"
