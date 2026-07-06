"""中文说明：覆盖 AI 主观题评分的校验、JSON 修正和落库行为。"""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.ai import AiConfig
from app.services.llm import ai_grading_service
from app.services.llm.ai_grading_service import ask_grading_question, grade_subjective_answer, latest_grading, stream_grading_question
from app.services.llm.deepseek_client import AiClientError


def make_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add(
        Question(
            id="q-sub",
            part_id="q-sub",
            title="subjective",
            type="system_design",
            type_label="系统设计题",
            difficulty="4",
            tags=["Agent"],
            directions=["Agent"],
            import_order=1,
            stem="设计一个 Agent 工具调用系统。",
            material=None,
            options=[],
            standard_answer="需要覆盖工具注册、权限、调用链路、错误处理和审计。",
            answer_text="参考答案",
            explanation="标准解析",
            exam_points=["工具调用"],
            common_mistakes=None,
            follow_up_question=None,
            scoring_standard="重点看权限、错误处理、审计。",
            source_text="source",
            parse_warnings=[],
            version=1,
        )
    )
    db.add(
        Question(
            id="q-obj",
            part_id="q-obj",
            title="objective",
            type="single_choice",
            type_label="单选题",
            difficulty="1",
            tags=[],
            directions=[],
            import_order=2,
            stem="选 A？",
            material=None,
            options=[{"key": "A", "text": "对"}, {"key": "B", "text": "错"}],
            standard_answer="A",
            answer_text="A",
            explanation=None,
            exam_points=[],
            common_mistakes=None,
            follow_up_question=None,
            scoring_standard=None,
            source_text="source",
            parse_warnings=[],
            version=1,
        )
    )
    db.add(Attempt(id="a-sub", question_id="q-sub", user_answer_raw="我会设计工具注册表和权限校验。", is_correct=None, review_status="pending", question_version=1, question_snapshot={}))
    db.add(Attempt(id="a-empty", question_id="q-sub", user_answer_raw="  ", is_correct=None, review_status="pending", question_version=1, question_snapshot={}))
    db.add(Attempt(id="a-obj", question_id="q-obj", user_answer_raw="A", is_correct=True, review_status=None, question_version=1, question_snapshot={}))
    db.commit()
    return db


def test_objective_question_cannot_be_ai_graded() -> None:
    db = make_db()
    with pytest.raises(AiClientError, match="客观题"):
        grade_subjective_answer(db, AiConfig(api_key="sk-test"), "q-obj", "a-obj")


def test_empty_subjective_answer_returns_zero_without_model(monkeypatch) -> None:
    db = make_db()

    def should_not_call(**kwargs):
        raise AssertionError("empty answer should not call LLM")

    monkeypatch.setattr(ai_grading_service, "chat_completion", should_not_call)
    result = grade_subjective_answer(db, AiConfig(api_key="sk-test"), "q-sub", "a-empty")
    assert result.score == 0
    assert result.level == "严重不足"
    assert result.result and result.result.missing_points == ["未作答"]


def test_invalid_ai_json_is_rejected(monkeypatch) -> None:
    db = make_db()
    monkeypatch.setattr(ai_grading_service, "chat_completion", lambda **kwargs: "not json")
    with pytest.raises(AiClientError) as exc:
        grade_subjective_answer(db, AiConfig(api_key="sk-test"), "q-sub", "a-sub")
    assert exc.value.code == "INVALID_AI_JSON"


def test_score_is_normalized_and_result_saved(monkeypatch) -> None:
    db = make_db()
    captured: dict[str, object] = {}
    raw = """
    {
      "score": 10.3,
      "max_score": 12,
      "level": "随便",
      "summary": "覆盖了部分工程点。",
      "dimension_scores": [{"name": "权限", "score": 2.2, "max_score": 3, "comment": "有提到"}],
      "matched_points": ["权限校验"],
      "missing_points": ["审计"],
      "wrong_or_unclear_points": [],
      "improvement_suggestion": "补充错误处理。",
      "better_answer": "可以按注册、鉴权、调用、观测展开。"
    }
    """
    def fake_chat_completion(**kwargs):
        captured.update(kwargs)
        return raw

    monkeypatch.setattr(ai_grading_service, "chat_completion", fake_chat_completion)
    before = db.get(Attempt, "a-sub")
    result = grade_subjective_answer(db, AiConfig(api_key="sk-test", model="deepseek-test"), "q-sub", "a-sub")
    after = db.get(Attempt, "a-sub")
    saved = db.scalar(select(AiGradingResult).where(AiGradingResult.attempt_id == "a-sub"))
    latest = latest_grading(db, "a-sub")
    assert result.score == 10
    assert result.level == "优秀"
    assert captured["model"] == "deepseek-v4-pro"
    assert captured["thinking"] == {"type": "disabled"}
    assert captured["max_tokens"] == 4096
    assert result.result and result.result.dimension_scores[0].score == 2
    assert saved is not None
    assert latest.grading_id == saved.id
    assert before.user_answer_raw == after.user_answer_raw
    assert after.is_correct is None
    assert after.review_status == "pending"


def test_invalid_json_retries_once(monkeypatch) -> None:
    db = make_db()
    calls: list[dict[str, object]] = []
    valid = """
    {
      "score": 6.4,
      "max_score": 10,
      "level": "一般",
      "summary": "有部分要点。",
      "dimension_scores": [],
      "matched_points": [],
      "missing_points": ["审计"],
      "wrong_or_unclear_points": [],
      "improvement_suggestion": "补充流程。",
      "better_answer": "按注册、鉴权、执行、观测回答。"
    }
    """

    def fake_chat_completion(**kwargs):
        calls.append(kwargs)
        return "not json" if len(calls) == 1 else valid

    monkeypatch.setattr(ai_grading_service, "chat_completion", fake_chat_completion)
    result = grade_subjective_answer(db, AiConfig(api_key="sk-test"), "q-sub", "a-sub")
    assert result.score == 6.5
    assert len(calls) == 2


def test_grading_chat_saves_messages_without_changing_attempt(monkeypatch) -> None:
    db = make_db()
    result = AiGradingResult(
        question_id="q-sub",
        attempt_id="a-sub",
        provider="deepseek",
        model="deepseek-v4-pro",
        rubric_version="v1",
        score=7.5,
        max_score=10,
        level="合格",
        summary="覆盖部分要点。",
        result_json={
            "score": 7.5,
            "max_score": 10,
            "level": "合格",
            "summary": "覆盖部分要点。",
            "dimension_scores": [],
            "matched_points": ["权限"],
            "missing_points": ["审计"],
            "wrong_or_unclear_points": [],
            "improvement_suggestion": "补充审计。",
            "better_answer": "按注册、鉴权、执行、审计回答。",
        },
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    monkeypatch.setattr(ai_grading_service, "chat_completion", lambda **kwargs: "因为你没有写审计，所以这里扣分。")
    response = ask_grading_question(db, AiConfig(api_key="sk-test"), result.id, "为什么扣分？")
    messages = db.query(AiGradingMessage).filter(AiGradingMessage.grading_id == result.id).all()
    attempt = db.get(Attempt, "a-sub")
    assert len(messages) == 2
    assert response.messages[-1].content == "因为你没有写审计，所以这里扣分。"
    assert attempt.is_correct is None
    assert attempt.review_status == "pending"


def test_grading_chat_stream_saves_messages(monkeypatch) -> None:
    db = make_db()
    result = AiGradingResult(
        question_id="q-sub",
        attempt_id="a-sub",
        provider="deepseek",
        model="deepseek-v4-pro",
        rubric_version="v1",
        score=7.5,
        max_score=10,
        level="合格",
        summary="覆盖部分要点。",
        result_json={
            "score": 7.5,
            "max_score": 10,
            "level": "合格",
            "summary": "覆盖部分要点。",
            "dimension_scores": [],
            "matched_points": ["权限"],
            "missing_points": ["审计"],
            "wrong_or_unclear_points": [],
            "improvement_suggestion": "补充审计。",
            "better_answer": "按注册、鉴权、执行、审计回答。",
        },
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    def fake_stream_chat_completion(**kwargs):
        yield "因为"
        yield "缺少审计。"

    monkeypatch.setattr(ai_grading_service, "stream_chat_completion", fake_stream_chat_completion)
    events = list(stream_grading_question(db, AiConfig(api_key="sk-test"), result.id, "为什么扣分？"))
    messages = db.query(AiGradingMessage).filter(AiGradingMessage.grading_id == result.id).all()
    assert any('"type": "delta"' in item for item in events)
    assert any('"type": "done"' in item for item in events)
    assert len(messages) == 2
    assert messages[-1].content == "因为缺少审计。"
