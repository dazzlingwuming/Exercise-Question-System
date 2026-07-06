"""中文说明：覆盖练习会话的分页、游标和各练习模式题目快照。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.user_question_state import UserQuestionState
from app.schemas.practice import PracticeSessionCreate
from app.services.attempt_service import submit_answer
from app.services.practice_session_service import (
    create_practice_session,
    get_practice_session,
    get_session_group,
    move_to_next_group,
    move_to_next_question,
    move_to_previous_question,
)
from app.services.user_question_state_service import safe_states_for_questions


def make_db(total: int = 45) -> Session:
    """中文说明：构造带方向、考察点和答题记录的测试数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    db.add_all(
        [
            make_question(
                f"q{index}",
                index,
                "single_choice" if index % 2 else "multiple_choice",
                "进阶" if index % 3 == 0 else "基础",
                ["工作流 Agent"] if index <= 10 else ["RAG"],
                ["上下文工程"] if index % 4 == 0 else ["安全权限"],
            )
            for index in range(1, total + 1)
        ]
    )
    db.commit()
    return db


def make_question(id: str, order: int, type: str, difficulty: str, directions: list[str], exam_points: list[str]) -> Question:
    """中文说明：构造一道基础选择题。"""

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


def test_sequential_session_total_first_group_and_next_group() -> None:
    """中文说明：顺序会话 total 是候选总数，第一组和下一组按 page_size 切片。"""

    db = make_db()
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    assert session.total == 45
    assert len(session.items) == 20
    assert [item.id for item in session.items[:2]] == ["q1", "q2"]
    second = move_to_next_group(db, session.session_id)
    assert second.current_index == 20
    assert [item.id for item in second.items[:2]] == ["q21", "q22"]
    assert len(second.items) == 20


def test_group_finished_and_last_group_flags() -> None:
    """中文说明：组末尾下一题返回 group_finished，最后一组不再有下一组。"""

    db = make_db()
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    practice_session = db.get(PracticeSession, session.session_id)
    practice_session.current_index = 19
    db.commit()
    moved = move_to_next_question(db, session.session_id)
    assert moved.status == "group_finished"
    assert moved.current_index == 19
    assert moved.has_next_group is True
    move_to_next_group(db, session.session_id)
    last = move_to_next_group(db, session.session_id)
    assert last.current_group_start == 40
    assert len(last.items) == 5
    assert last.has_next_group is False


def test_random_session_snapshot_has_no_duplicates_and_next_group_is_slice() -> None:
    """中文说明：随机会话生成后保存快照，下一组不是重新抽第一组。"""

    db = make_db()
    session = create_practice_session(db, PracticeSessionCreate(mode="random", order="random", page_size=20))
    state = get_practice_session(db, session.session_id)
    all_ids = db.get(PracticeSession, session.session_id).question_ids_json
    second = move_to_next_group(db, session.session_id)
    assert len(all_ids) == len(set(all_ids)) == 45
    assert [item.id for item in second.items] == all_ids[20:40]
    assert [item.id for item in session.items] == all_ids[:20]
    assert state.total == 45


def test_wrong_session_only_wrong_and_start_question_id() -> None:
    """中文说明：错题会话只包含错题，且错题页指定题会成为当前题。"""

    db = make_db(8)
    submit_answer(db, db.get(Question, "q1"), "B")
    submit_answer(db, db.get(Question, "q2"), "B")
    submit_answer(db, db.get(Question, "q3"), "A")
    session = create_practice_session(db, PracticeSessionCreate(mode="wrong", order="import_order", page_size=20, start_question_id="q2"))
    state = get_practice_session(db, session.session_id)
    assert [item.id for item in session.items] == ["q2", "q1"]
    assert state.current_question.id == "q2"


def test_direction_exam_point_and_unanswered_sessions() -> None:
    """中文说明：方向、考察点和未答题会话都只包含匹配题目。"""

    db = make_db(12)
    submit_answer(db, db.get(Question, "q1"), "A")
    by_direction = create_practice_session(db, PracticeSessionCreate(mode="direction", direction="工作流 Agent", page_size=20))
    by_exam_point = create_practice_session(db, PracticeSessionCreate(mode="exam_point", exam_point="上下文工程", page_size=20))
    unanswered = create_practice_session(db, PracticeSessionCreate(mode="unanswered", page_size=20))
    assert all("工作流 Agent" in item.directions for item in by_direction.items)
    assert all("上下文工程" in item.exam_points for item in by_exam_point.items)
    assert "q1" not in [item.id for item in unanswered.items]


def test_previous_and_restore_session_state() -> None:
    """中文说明：上一题能回退游标，session_id 可以恢复当前状态。"""

    db = make_db()
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    move_to_next_question(db, session.session_id)
    state = get_practice_session(db, session.session_id)
    assert state.current_index == 1
    assert state.current_question.id == "q2"
    previous = move_to_previous_question(db, session.session_id)
    restored = get_practice_session(db, session.session_id)
    assert previous.current_index == 0
    assert restored.current_question.id == "q1"


def test_get_group_by_offset_does_not_change_current_index() -> None:
    """中文说明：按 offset 读取分组不会修改当前练习游标。"""

    db = make_db()
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    group = get_session_group(db, session.session_id, offset=20, limit=20)
    state = get_practice_session(db, session.session_id)
    assert [item.id for item in group.items[:2]] == ["q21", "q22"]
    assert state.current_index == 0


def test_new_practice_modes_exclude_answered_but_all_practice_includes_them() -> None:
    """中文说明：新题类练习默认排除已答题，全量练习才明确允许复刷。"""

    db = make_db(6)
    submit_answer(db, db.get(Question, "q1"), "A")
    submit_answer(db, db.get(Question, "q2"), "B")
    sequential = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    random_session = create_practice_session(db, PracticeSessionCreate(mode="random", order="random", page_size=20))
    all_practice = create_practice_session(db, PracticeSessionCreate(mode="all_practice", page_size=20, allow_answered=True))
    assert "q1" not in [item.id for item in sequential.items]
    assert "q2" not in [item.id for item in random_session.items]
    assert {"q1", "q2"}.issubset({item.id for item in all_practice.items})


def test_submit_answer_updates_user_question_state() -> None:
    """中文说明：提交答案后维护累计状态，供后续新题去重和错题复习使用。"""

    db = make_db(3)
    result = submit_answer(db, db.get(Question, "q1"), "B")
    state = db.query(UserQuestionState).filter(UserQuestionState.question_id == "q1").one()
    wrong = create_practice_session(db, PracticeSessionCreate(mode="wrong", page_size=20))
    assert result.is_correct is False
    assert state.attempt_count == 1
    assert state.wrong_count == 1
    assert state.status == "wrong"
    assert [item.id for item in wrong.items] == ["q1"]


def test_safe_question_state_does_not_expose_historical_answer() -> None:
    """中文说明：答题页只能读取安全状态摘要，不能拿到历史答案或正确答案。"""

    db = make_db(2)
    submit_answer(db, db.get(Question, "q1"), "B")
    state = safe_states_for_questions(db, ["q1"])[0]
    payload = state.model_dump()
    assert payload["question_id"] == "q1"
    assert payload["attempt_count"] == 1
    assert payload["last_result"] == "wrong"
    assert "user_answer_raw" not in payload
    assert "correct_answer_normalized" not in payload


def test_shortage_fields_when_new_questions_less_than_page_size() -> None:
    """中文说明：新题不足一组时明确提示，不静默混入已答题。"""

    db = make_db(3)
    submit_answer(db, db.get(Question, "q1"), "A")
    submit_answer(db, db.get(Question, "q2"), "A")
    session = create_practice_session(db, PracticeSessionCreate(mode="sequential", page_size=20))
    assert [item.id for item in session.items] == ["q3"]
    assert session.shortage_code == "NOT_ENOUGH_NEW_QUESTIONS"
    assert session.requested_count == 20
    assert session.available_count == 1
