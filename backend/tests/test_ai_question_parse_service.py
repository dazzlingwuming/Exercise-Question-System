"""覆盖原始文本 AI 解析的结果归一化与确定性校验。"""

import json

import app.services.llm.ai_question_parse_service as parse_service
from app.schemas.ai import AiQuestionParseRequest


def test_parse_question_draft_normalizes_single_choice_answer(monkeypatch) -> None:
    monkeypatch.setattr(
        parse_service,
        "chat_completion",
        lambda **_: json.dumps(
            {
                "is_single_question": True,
                "detected_type": "单选题",
                "candidate": {
                    "type": "single_choice",
                    "difficulty": "3",
                    "tags": ["Agent"],
                    "directions": ["基础"],
                    "stem": "以下哪一项正确？",
                    "options": {"A": "错误", "B": "正确"},
                    "standard_answer": "Answer: B",
                    "explanation": "B 与题干一致。",
                    "exam_points": ["工具调用"],
                },
            },
            ensure_ascii=False,
        ),
    )

    result = parse_service.parse_question_draft(AiQuestionParseRequest(source_text="一段原始题目", api_key="test-key"))

    assert result.detected_type == "single_choice"
    assert result.candidate.standard_answer == "B"
    assert [option.key for option in result.candidate.options] == ["A", "B"]
    assert not [item for item in result.issues if item.severity == "error"]


def test_parse_question_draft_marks_subjective_missing_scoring_standard(monkeypatch) -> None:
    monkeypatch.setattr(
        parse_service,
        "chat_completion",
        lambda **_: json.dumps(
            {
                "is_single_question": True,
                "candidate": {"type": "system_design", "stem": "设计一个任务系统", "reference_answer": "使用状态机"},
            },
            ensure_ascii=False,
        ),
    )

    result = parse_service.parse_question_draft(AiQuestionParseRequest(source_text="一道主观题", api_key="test-key"))

    assert result.candidate.type == "system_design"
    assert any(item.code == "MISSING_SCORING_STANDARD" and item.severity == "error" for item in result.issues)


def test_parse_question_draft_preserves_multiple_question_warning(monkeypatch) -> None:
    monkeypatch.setattr(
        parse_service,
        "chat_completion",
        lambda **_: json.dumps(
            {
                "is_single_question": False,
                "candidate": {"type": "short_answer", "stem": "第一题", "reference_answer": "答案", "scoring_standard": "10 分"},
            },
            ensure_ascii=False,
        ),
    )

    result = parse_service.parse_question_draft(AiQuestionParseRequest(source_text="两道题混在一起", api_key="test-key"))

    assert any(item.code == "MULTIPLE_QUESTIONS" and item.severity == "error" for item in result.issues)
