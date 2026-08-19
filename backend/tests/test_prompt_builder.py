"""中文说明：覆盖 AI 讲题提示词的通用输出格式约束。"""

from app.models.question import Question
from app.services.llm.prompt_builder import build_messages


def test_all_tutor_stages_require_supported_math_delimiters() -> None:
    question = Question(
        id="q-prompt",
        part_id="q-prompt",
        title="prompt",
        type="short_answer",
        type_label="简答题",
        difficulty="2",
        tags=[],
        directions=[],
        stem="请解释公式。",
        material=None,
        options=[],
        standard_answer=None,
        answer_text=None,
        explanation=None,
        exam_points=[],
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard=None,
        source_text="source",
        parse_warnings=[],
    )

    for stage, submitted in [
        ("hint", False),
        ("explanation", True),
        ("engineering_example", True),
        ("interview_followup", True),
        ("free_chat", True),
    ]:
        messages = build_messages(
            question=question,
            attempt=None,
            submitted=submitted,
            stage=stage,
            user_content="请回答。",
            history=[],
        )
        system_prompt = messages[0]["content"]

        assert "`$...$`" in system_prompt
        assert "`$$`" in system_prompt
        assert "`\\(...\\)`" in system_prompt
        assert "`\\[...\\]`" in system_prompt
        assert "成对" in system_prompt
        assert "不要把 `$$` 放在中文句子中间" in system_prompt
        assert "输出前自检" in system_prompt
