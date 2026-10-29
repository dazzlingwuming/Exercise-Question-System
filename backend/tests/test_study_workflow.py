from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.database import Base
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.user_question_state import UserQuestionState
from app.schemas.practice import PracticeSessionCreate
from app.services.attempt_service import latest_attempts_for_questions, self_review_attempt, submit_answer
from app.services.practice_report_service import session_answers, session_report
from app.services.practice_session_service import create_practice_session, jump_to_question, retry_session, move_to_previous_question
from app.services.study_plan_service import daily_question_ids, study_overview
from app.services.user_question_state_service import answered_question_ids, due_question_ids, wrong_question_ids


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        for i in range(6):
            session.add(Question(id=f"q{i}", part_id=f"q{i}", title=f"题目{i}", type="short_answer" if i == 4 else "single_choice",
                type_label="简答题" if i == 4 else "单选题", difficulty="基础", import_order=i,
                stem=f"题干{i}", options=[], standard_answer="A", explanation="原始解析", exam_points=["推理"], source_text="test"))
        session.commit()
        yield session
    engine.dispose()


def test_daily_queue_prioritizes_due_then_weak_then_new_and_is_stable(db):
    for qid in ("q1", "q2", "q3", "q5"):
        submit_answer(db, db.get(Question, qid), "B" if qid in ("q1", "q3") else "A")
    db.get(UserQuestionState, "local:q2").next_review_at = datetime.now() - timedelta(days=1)
    db.get(UserQuestionState, "local:q3").is_excluded = True
    db.get(Question, "q5").is_deleted = True
    db.commit()
    assert daily_question_ids(db, 4) == ["q2", "q1", "q0", "q4"]
    response = create_practice_session(db, PracticeSessionCreate(mode="daily", limit=2))
    saved = db.get(PracticeSession, response.session_id)
    assert saved.question_ids_json == ["q2", "q1"]
    submit_answer(db, db.get(Question, "q2"), "A", saved.id)
    assert saved.question_ids_json == ["q2", "q1"]  # No reshuffle mid-session.


def test_daily_respects_topic_filters(db):
    response = create_practice_session(db, PracticeSessionCreate(mode="daily", exam_point="推理", type="short_answer", limit=5))
    assert [q.id for q in response.items] == ["q4"]
    assert daily_question_ids(db, 10, PracticeSessionCreate(exam_point="不存在")) == []


def test_report_uses_only_this_session_latest_attempt_and_distinguishes_skips(db):
    submit_answer(db, db.get(Question, "q0"), "B")  # An older run isn't this run.
    response = create_practice_session(db, PracticeSessionCreate(mode="all_practice"))
    session = db.get(PracticeSession, response.session_id)
    submit_answer(db, db.get(Question, "q1"), "B", session.id)
    submit_answer(db, db.get(Question, "q1"), "A", session.id)
    submit_answer(db, db.get(Question, "q2"), "B", session.id)
    submit_answer(db, db.get(Question, "q4"), "我的理解", session.id)
    db.get(Question, "q5").is_deleted = True
    db.commit()
    report = session_report(db, session)
    assert (report["answered"], report["correct"], report["wrong"], report["pending"], report["unanswered"], report["deleted"]) == (3, 1, 1, 1, 2, 1)
    assert report["accuracy"] == 50
    assert report["weak_points"] == [{"point": "推理", "count": 1}]
    assert "standard_answer" not in str(report)
    assert [q.id for q in retry_session(db, session, "mistakes").items] == ["q2"]
    assert {q.id for q in retry_session(db, session, "unanswered").items} == {"q0", "q3"}


def test_recovery_keeps_snapshot_and_does_not_expose_unanswered_questions(db):
    response = create_practice_session(db, PracticeSessionCreate(mode="all_practice"))
    session = db.get(PracticeSession, response.session_id)
    question = db.get(Question, "q1")
    submit_answer(db, question, "A", session.id)
    question.standard_answer = "B"
    question.explanation = "修改后的解析"
    db.commit()
    saved = session_answers(db, session)
    assert len(saved) == 1
    assert saved[0]["result"]["standard_answer"] == "A"
    assert saved[0]["result"]["explanation"] == "原始解析"
    assert saved[0]["answer"] == "A"


def test_position_and_previous_skip_deleted_questions(db):
    response = create_practice_session(db, PracticeSessionCreate(mode="all_practice", page_size=2))
    session = db.get(PracticeSession, response.session_id)
    db.get(Question, "q1").is_deleted = True
    db.commit()
    with pytest.raises(ValueError, match="删除"):
        jump_to_question(db, session, "q1")
    jumped = jump_to_question(db, session, "q2")
    assert jumped.current_index == 2
    previous = move_to_previous_question(db, session.id)
    assert previous.question.id == "q0"
    with pytest.raises(ValueError, match="不属于"):
        jump_to_question(db, session, "other")


def test_mastered_questions_still_have_a_review_date_and_old_review_does_not_rewind_state(db):
    question = db.get(Question, "q0")
    for _ in range(4):
        submit_answer(db, question, "A")
    state = db.get(UserQuestionState, "local:q0")
    assert state.status == "mastered"
    assert datetime.now() + timedelta(days=13) < state.next_review_at < datetime.now() + timedelta(days=15)
    first = submit_answer(db, db.get(Question, "q4"), "第一次")
    last = submit_answer(db, db.get(Question, "q4"), "第二次")
    self_review_attempt(db, db.get(Attempt, last.attempt_id), "wrong")
    self_review_attempt(db, db.get(Attempt, first.attempt_id), "correct")
    state = db.get(UserQuestionState, "local:q4")
    assert state.status == "wrong"
    assert state.last_attempt_id == last.attempt_id
    assert (state.correct_count, state.wrong_count) == (1, 1)


def test_today_counts_unique_questions_in_browser_timezone(db):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for _ in range(2):
        submit_answer(db, db.get(Question, "q0"), "A")
    old = submit_answer(db, db.get(Question, "q1"), "A")
    db.get(Attempt, old.attempt_id).created_at = now - timedelta(days=2)
    db.commit()
    assert study_overview(db, 480)["today_count"] == 1


def test_answer_cannot_be_attributed_to_unrelated_session(db):
    created = create_practice_session(db, PracticeSessionCreate(mode="all_practice", limit=1))
    with pytest.raises(ValueError, match="不属于"):
        submit_answer(db, db.get(Question, "q2"), "A", created.session_id)
    with pytest.raises(ValueError, match="不属于"):
        submit_answer(db, db.get(Question, "q0"), "A", "missing")


def test_partial_backfill_does_not_turn_old_attempts_into_new_questions(db):
    submit_answer(db, db.get(Question, "q0"), "A")
    submit_answer(db, db.get(Question, "q1"), "A")
    db.delete(db.get(UserQuestionState, "local:q0"))
    db.commit()
    assert answered_question_ids(db) == {"q0", "q1"}


def test_legacy_wrong_records_use_latest_result_and_mastered_records_return(db):
    submit_answer(db, db.get(Question, "q0"), "B")
    submit_answer(db, db.get(Question, "q0"), "A")
    submit_answer(db, db.get(Question, "q1"), "B")
    for qid in ("q0", "q1"):
        db.delete(db.get(UserQuestionState, f"local:{qid}"))
    submit_answer(db, db.get(Question, "q2"), "A")
    state = db.get(UserQuestionState, "local:q2")
    state.status = "mastered"
    state.next_review_at = None
    state.last_attempt_at = datetime.now() - timedelta(days=20)
    db.commit()
    assert wrong_question_ids(db) == {"q1"}
    assert "q2" in due_question_ids(db)
    assert daily_question_ids(db, 2) == ["q2", "q1"]


def test_latest_attempt_lookup_is_batched_and_preserves_requested_order(db):
    for qid in ("q0", "q1", "q2"):
        submit_answer(db, db.get(Question, qid), "B")
        submit_answer(db, db.get(Question, qid), "A")
    statements = []
    def record(*args):
        statements.append(args[2])
    event.listen(db.bind, "before_cursor_execute", record)
    try:
        attempts = latest_attempts_for_questions(db, ["q2", "q0", "q1", "q0"])
        assert [a.question_id for a in attempts] == ["q2", "q0", "q1"]
        assert all(a.is_correct for a in attempts)
        assert len(statements) <= 2
    finally:
        event.remove(db.bind, "before_cursor_execute", record)


def test_today_boundary_uses_browser_day_instead_of_utc_day(db, monkeypatch):
    from app.services import study_plan_service
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 10, 29, 0, 5, tzinfo=tz)
    monkeypatch.setattr(study_plan_service, "datetime", Clock)
    for qid, at in (("q0", datetime(2026, 10, 28, 15, 59)), ("q1", datetime(2026, 10, 28, 16, 1))):
        result = submit_answer(db, db.get(Question, qid), "A")
        db.get(Attempt, result.attempt_id).created_at = at
    db.commit()
    assert study_overview(db, 480)["today_count"] == 1
    assert study_overview(db, 0)["today_count"] == 0


def test_repeated_clock_tick_still_restores_the_last_submission(db, monkeypatch):
    from app.services import attempt_service
    from uuid import UUID
    class FrozenClock(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 10, 29, 2, 0, tzinfo=tz)
    monkeypatch.setattr(attempt_service, "datetime", FrozenClock)
    ids = iter([UUID("ffffffff-ffff-4fff-bfff-ffffffffffff"), UUID("00000000-0000-4000-8000-000000000000")])
    monkeypatch.setattr(attempt_service, "uuid4", lambda: next(ids))
    question = db.get(Question, "q0")
    first = submit_answer(db, question, "B")
    second = submit_answer(db, question, "A")
    latest = latest_attempts_for_questions(db, ["q0"])[0]
    assert latest.id == second.attempt_id and latest.is_correct
    assert latest.created_at > db.get(Attempt, first.attempt_id).created_at
