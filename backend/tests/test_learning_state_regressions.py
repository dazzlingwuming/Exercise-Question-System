"""中文说明：覆盖学习状态的关键回归场景，避免错题和自评数据被重复或误判。"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.attempt import Attempt
from app.models.question import Question
from app.models.user_question_state import UserQuestionState
from app.services.attempt_service import self_review_attempt, submit_answer
from app.services.user_question_state_service import wrong_question_ids


def make_db() -> Session:
    """中文说明：创建一套同时包含客观题和主观题的隔离数据库。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add_all(
        [
            make_question("q-objective", "single_choice", "A"),
            make_question("q-subjective", "short_answer", "参考答案"),
        ]
    )
    db.commit()
    return db


def make_question(question_id: str, question_type: str, standard_answer: str) -> Question:
    """中文说明：构造最小可答题题目。"""

    return Question(
        id=question_id,
        part_id=question_id,
        title=question_id,
        type=question_type,
        type_label=question_type,
        difficulty="基础",
        tags=["状态测试"],
        directions=["测试"],
        import_order=1,
        stem="测试题干",
        material=None,
        options=[] if question_type == "short_answer" else [{"key": "A", "text": "正确"}, {"key": "B", "text": "错误"}],
        standard_answer=standard_answer,
        answer_text=standard_answer,
        explanation="测试解析",
        exam_points=[],
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard="覆盖关键点" if question_type == "short_answer" else None,
        source_text="test",
        parse_warnings=[],
        version=1,
    )


def test_corrected_question_does_not_fall_back_to_historical_wrong_attempt() -> None:
    """中文说明：状态表已存在但当前无错题时，不能回退到历史错误记录。"""

    db = make_db()
    question = db.get(Question, "q-objective")
    submit_answer(db, question, "B")
    submit_answer(db, question, "A")

    state = db.get(UserQuestionState, "local:q-objective")
    assert state is not None
    assert state.status == "correct"
    assert wrong_question_ids(db) == set()
    db.close()


def test_partial_self_review_is_not_recorded_as_a_wrong_answer() -> None:
    """中文说明：部分答对保持 reviewing，不增加错误次数，也不写入 False。"""

    db = make_db()
    result = submit_answer(db, db.get(Question, "q-subjective"), "我的回答")
    attempt = db.get(Attempt, result.attempt_id)
    reviewed = self_review_attempt(db, attempt, "partial")
    state = db.get(UserQuestionState, "local:q-subjective")

    assert reviewed.is_correct is None
    assert reviewed.score == 0.5
    assert state is not None
    assert state.last_result == "partial"
    assert state.status == "reviewing"
    assert state.wrong_count == 0
    assert state.next_review_at is not None
    db.close()


def test_duplicate_self_review_is_idempotent_and_status_cannot_be_rewritten() -> None:
    """中文说明：重复请求不会重复累计掌握度；完成后不能改写为另一种结果。"""

    db = make_db()
    result = submit_answer(db, db.get(Question, "q-subjective"), "我的回答")
    attempt = db.get(Attempt, result.attempt_id)
    self_review_attempt(db, attempt, "correct")
    self_review_attempt(db, attempt, "correct")
    state = db.get(UserQuestionState, "local:q-subjective")

    assert state is not None
    assert state.correct_count == 1
    assert state.consecutive_correct_count == 1
    assert state.mastery_level == 1
    with pytest.raises(ValueError, match="已完成自评"):
        self_review_attempt(db, attempt, "wrong")
    db.close()
