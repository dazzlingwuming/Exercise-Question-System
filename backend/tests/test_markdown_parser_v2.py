"""覆盖统一 Markdown v2 的严格字段和题型校验。"""

from app.parsers.markdown_parser import parse_markdown_question_bank


VALID_V2 = """<!-- question-bank-format: v2 -->

# 示例题库

--- question ---
question_id: q_parser_sc_001
type: single_choice
difficulty: 3
tags:
  - Parser
directions:
  - 基础
exam_points:
  - 严格校验
stem: |
  下列哪项正确？
options:
  A: 错误选项
  B: 正确选项
answer: B
explanation: |
  B 正确。

--- question ---
question_id: q_parser_design_001
type: system_design
difficulty: 4
stem: |
  请设计一个可恢复任务系统。
reference_answer: |
  使用状态机、幂等键和可观测性。
scoring_standard: |
  - 状态机完整：4 分
  - 幂等性合理：3 分
  - 可观测性完整：3 分
"""


def test_parse_v2_valid_objective_and_subjective_questions() -> None:
    result = parse_markdown_question_bank(VALID_V2)

    assert result.format_version == "v2"
    assert result.is_legacy is False
    assert not result.errors
    assert [item.id for item in result.questions] == ["q_parser_sc_001", "q_parser_design_001"]
    assert result.questions[0].standard_answer == "B"
    assert result.questions[1].standard_answer == "使用状态机、幂等键和可观测性。"
    assert any(item.field == "explanation" for item in result.warnings)


def test_parse_v2_reports_field_level_answer_error() -> None:
    result = parse_markdown_question_bank(VALID_V2.replace("answer: B", "answer: C"))

    assert [item.id for item in result.questions] == ["q_parser_design_001"]
    assert any(item.question_id == "q_parser_sc_001" and item.field == "answer" for item in result.errors)


def test_parse_v2_rejects_duplicate_id_even_when_one_block_is_invalid() -> None:
    text = VALID_V2 + """

--- question ---
question_id: q_parser_sc_001
type: short_answer
difficulty: 2
reference_answer: |
  这是重复题。
scoring_standard: |
  - 有答案：10 分
"""
    result = parse_markdown_question_bank(text)

    assert any(item.field == "question_id" and "重复" in item.message for item in result.errors)


def test_legacy_format_remains_detectable_for_migration() -> None:
    result = parse_markdown_question_bank("""### Part 1-001｜单选题｜基础\n题目：测试\n选项： A. 错 B. 对\n标准答案：B""")

    assert result.format_version == "legacy"
    assert result.is_legacy is True
