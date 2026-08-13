"""中文说明：覆盖 AI 讲题助手的权限、上下文隔离和 thread 复用。"""

import json

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.ai import AiConfig
from app.services.llm import ai_tutor_service
from app.services.llm.ai_tutor_service import get_thread_response, run_action, run_user_message, stream_action, stream_previous_summary, stream_user_message
from app.services.llm.deepseek_client import AiClientError


def make_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add(
        Question(
            id="q-ai",
            part_id="q-ai",
            title="AI",
            type="single_choice",
            type_label="单选题",
            difficulty="2",
            tags=["Agent"],
            directions=["Agent"],
            import_order=1,
            stem="这道题考什么？",
            material=None,
            options=[{"key": "A", "text": "错"}, {"key": "B", "text": "对"}],
            standard_answer="B",
            answer_text="B",
            explanation="标准解析",
            exam_points=["AI 讲题"],
            common_mistakes=None,
            follow_up_question=None,
            scoring_standard="选 B",
            source_text="source",
            parse_warnings=[],
            version=1,
        )
    )
    db.commit()
    return db


def test_missing_api_key_blocks_ai_call() -> None:
    db = make_db()
    try:
        run_action(db, "q-ai", None, "hint", AiConfig(api_key=""))
    except AiClientError as exc:
        assert exc.code == "AI_CONFIG_MISSING"
    else:
        raise AssertionError("missing API key should fail")


def test_explanation_not_allowed_before_submit() -> None:
    db = make_db()
    try:
        run_action(db, "q-ai", None, "explanation", AiConfig(api_key="sk-test"))
    except AiClientError as exc:
        assert exc.code == "ACTION_NOT_ALLOWED"
    else:
        raise AssertionError("explanation before submit should fail")


def test_pre_submit_prompt_does_not_include_answer(monkeypatch) -> None:
    db = make_db()
    captured: dict[str, object] = {}

    def fake_chat_completion(**kwargs):
        captured["messages"] = kwargs["messages"]
        return "提示内容"

    monkeypatch.setattr(ai_tutor_service, "chat_completion", fake_chat_completion)
    run_action(db, "q-ai", None, "hint", AiConfig(api_key="sk-test"))
    prompt_text = "\n".join(str(message["content"]) for message in captured["messages"])
    assert "standard_answer" not in prompt_text
    assert "标准解析" not in prompt_text
    assert "选 B" not in prompt_text


def test_pre_submit_thread_history_is_hidden_after_refresh(monkeypatch) -> None:
    db = make_db()
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "提示内容")
    active_thread = run_action(db, "q-ai", None, "hint", AiConfig(api_key="sk-test"))
    restored_thread = get_thread_response(db, "q-ai", None)
    assert active_thread.messages
    assert restored_thread.messages == []


def test_same_question_and_attempt_reuse_thread(monkeypatch) -> None:
    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="A", is_correct=False, question_version=1, question_snapshot={}))
    db.commit()
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "讲解内容")
    first = run_action(db, "q-ai", "a1", "explanation", AiConfig(api_key="sk-test"))
    second = get_thread_response(db, "q-ai", "a1")
    assert first.thread_id == second.thread_id
    assert second.has_explanation is True


def test_submitted_question_can_request_example_without_explanation(monkeypatch) -> None:
    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="B", is_correct=True, question_version=1, question_snapshot={}))
    db.commit()
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "工程例子")
    thread = run_action(db, "q-ai", "a1", "engineering_example", AiConfig(api_key="sk-test"))
    assert thread.has_engineering_example is True


def test_summary_deletes_raw_ai_messages(monkeypatch) -> None:
    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="B", is_correct=True, question_version=1, question_snapshot={}))
    db.commit()
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "提示内容")
    run_action(db, "q-ai", None, "hint", AiConfig(api_key="sk-test"))

    def fake_stream_chat_completion(**kwargs):
        yield "学习摘要"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", fake_stream_chat_completion)
    list(stream_previous_summary(db, "q-ai", "a1", AiConfig(api_key="sk-test")))
    thread = get_thread_response(db, "q-ai", "a1")
    assert thread.previous_summary is not None
    assert "学习摘要" in thread.previous_summary
    assert thread.messages == []
    assert thread.has_previous_ai_history is False


def test_summary_includes_and_deletes_grading_chat(monkeypatch) -> None:
    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="B", is_correct=True, question_version=1, question_snapshot={}))
    db.commit()
    grading = AiGradingResult(
        question_id="q-ai",
        attempt_id="a1",
        provider="deepseek",
        model="deepseek-v4-pro",
        rubric_version="v1",
        score=7.5,
        max_score=10,
        level="合格",
        summary="答对但表达不完整。",
        result_json={
            "score": 7.5,
            "max_score": 10,
            "level": "合格",
            "summary": "答对但表达不完整。",
            "dimension_scores": [],
            "matched_points": ["核心方向"],
            "missing_points": ["工程边界"],
            "wrong_or_unclear_points": [],
            "improvement_suggestion": "补充边界。",
            "better_answer": "更完整表达。",
        },
    )
    db.add(grading)
    db.commit()
    db.refresh(grading)
    db.add(AiGradingMessage(grading_id=grading.id, role="user", content="为什么扣分？"))
    db.add(AiGradingMessage(grading_id=grading.id, role="assistant", content="因为缺少工程边界。"))
    db.commit()

    captured: dict[str, object] = {}

    def fake_stream_chat_completion(**kwargs):
        captured["messages"] = kwargs["messages"]
        yield "评分追问摘要"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", fake_stream_chat_completion)
    list(stream_previous_summary(db, "q-ai", "a1", AiConfig(api_key="sk-test")))
    prompt_text = "\n".join(str(message["content"]) for message in captured["messages"])
    thread = get_thread_response(db, "q-ai", "a1")
    assert "为什么扣分" in prompt_text
    assert "因为缺少工程边界" in prompt_text
    assert thread.previous_summary is not None
    assert db.query(AiGradingMessage).filter(AiGradingMessage.grading_id == grading.id).count() == 0


def test_pre_submit_answer_leak_request_uses_guardrail_without_model() -> None:
    db = make_db()
    thread = run_user_message(db, "q-ai", None, "直接告诉我标准答案是什么", AiConfig(api_key=""))
    assert thread.messages[-1].stage == "guardrail"
    assert "不能直接给出标准答案" in thread.messages[-1].content


def test_pre_submit_stream_never_sends_raw_answer_chunks(monkeypatch) -> None:
    """中文说明：模型即使流式泄露答案，也必须在服务端缓冲、过滤后才能发给浏览器。"""

    db = make_db()

    def fake_stream_chat_completion(**kwargs):
        yield "正确答案"
        yield "是 B。"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", fake_stream_chat_completion)
    events = list(stream_action(db, "q-ai", None, "hint", AiConfig(api_key="sk-test")))
    payload = "".join(events)

    assert "正确答案是 B" not in payload
    assert "不能直接给出标准答案" in payload


def test_stream_user_message_falls_back_after_unexpected_stream_error(monkeypatch) -> None:
    """中文说明：流式供应商异常不能留下只有用户消息的半完成对话。"""

    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="B", is_correct=True, question_version=1, question_snapshot={}))
    db.commit()
    fallback_calls: list[object] = []

    def broken_stream(**kwargs):
        raise RuntimeError("unexpected provider frame")
        yield "unreachable"

    def fake_fallback(**kwargs):
        fallback_calls.append(kwargs["messages"])
        return "回退回复"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", broken_stream)
    monkeypatch.setattr(ai_tutor_service, "chat_completion", fake_fallback)

    payloads = [json.loads(event.removeprefix("data: ").strip()) for event in stream_user_message(db, "q-ai", "a1", "为什么是这样？", AiConfig(api_key="sk-test"))]

    assert [payload["type"] for payload in payloads] == ["delta", "done"]
    assert payloads[0]["content"] == "回退回复"
    assert fallback_calls
    messages = db.query(ai_tutor_service.AiTutorMessage).order_by(ai_tutor_service.AiTutorMessage.created_at).all()
    assert [(message.role, message.content) for message in messages] == [
        ("user", "为什么是这样？"),
        ("assistant", "回退回复\n\n> AI 讲解仅供辅助，最终以题库标准答案为准。"),
    ]


def test_pre_submit_stream_user_message_falls_back_and_persists_both_messages(monkeypatch) -> None:
    """中文说明：答题中的自由追问也要从首个流异常恢复成完整、安全的对话。"""

    db = make_db()

    def broken_stream(**kwargs):
        raise RuntimeError("unexpected provider frame")
        yield "unreachable"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", broken_stream)
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "可以先比较题干中的约束条件，再逐项排除不符合的选项。")

    payloads = [
        json.loads(event.removeprefix("data: ").strip())
        for event in stream_user_message(db, "q-ai", None, "我应该从哪里开始分析？", AiConfig(api_key="sk-test"))
    ]

    assert [payload["type"] for payload in payloads] == ["delta", "done"]
    assert "逐项排除" in payloads[0]["content"]
    assert payloads[0]["content"]
    assert [(message["role"], message["content"]) for message in payloads[1]["thread"]["messages"]] == [
        ("user", "我应该从哪里开始分析？"),
        ("assistant", payloads[0]["content"]),
    ]
    messages = db.query(ai_tutor_service.AiTutorMessage).order_by(ai_tutor_service.AiTutorMessage.created_at).all()
    assert [(message.role, message.content) for message in messages] == [
        ("user", "我应该从哪里开始分析？"),
        ("assistant", payloads[0]["content"]),
    ]


def test_pre_submit_stream_fallback_sanitizes_answer_leak(monkeypatch) -> None:
    """中文说明：非流式恢复结果也必须在答题中经过防泄题过滤。"""

    db = make_db()

    def broken_stream(**kwargs):
        raise RuntimeError("unexpected provider frame")
        yield "unreachable"

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", broken_stream)
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: "正确答案是 B。")

    payloads = [
        json.loads(event.removeprefix("data: ").strip())
        for event in stream_user_message(db, "q-ai", None, "我应该从哪里开始分析？", AiConfig(api_key="sk-test"))
    ]

    assert [payload["type"] for payload in payloads] == ["delta", "done"]
    assert "正确答案是 B" not in payloads[0]["content"]
    assert "不能直接给出标准答案" in payloads[0]["content"]
    assert payloads[1]["thread"]["messages"][-1]["content"] == payloads[0]["content"]
    assistant = db.query(ai_tutor_service.AiTutorMessage).filter_by(role="assistant").one()
    assert assistant.content == payloads[0]["content"]


def test_stream_user_message_emits_error_after_visible_partial_stream_failure(monkeypatch) -> None:
    """中文说明：已向浏览器输出部分内容后不重试，必须以终态错误结束。"""

    db = make_db()
    db.add(Attempt(id="a1", question_id="q-ai", user_answer_raw="B", is_correct=True, question_version=1, question_snapshot={}))
    db.commit()

    def broken_stream(**kwargs):
        yield "部分回复"
        raise RuntimeError("interrupted after visible delta")

    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", broken_stream)
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: (_ for _ in ()).throw(AssertionError("partial output must not be retried")))

    payloads = [json.loads(event.removeprefix("data: ").strip()) for event in stream_user_message(db, "q-ai", "a1", "为什么是这样？", AiConfig(api_key="sk-test"))]

    assert [payload["type"] for payload in payloads] == ["delta", "error"]
    assert payloads[0]["content"] == "部分回复"
    assert payloads[1]["error_code"] == "AI_STREAM_INTERRUPTED"
