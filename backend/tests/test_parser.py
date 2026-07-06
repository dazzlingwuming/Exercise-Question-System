"""中文说明：覆盖 Markdown 题库解析器的核心兼容场景。"""

from pathlib import Path

from app.config import settings
from app.parsers.markdown_parser import parse_markdown_question_bank


def test_read_default_question_bank() -> None:
    """中文说明：确认根目录题库文件存在且可读取。"""

    assert settings.question_bank_path.exists()
    assert "--- question ---" in settings.question_bank_path.read_text(encoding="utf-8")[:200]


def test_parse_real_question_bank_has_structured_questions() -> None:
    """中文说明：真实题库至少应解析出大量结构化题目。"""

    result = parse_markdown_question_bank(settings.question_bank_path.read_text(encoding="utf-8"))
    assert len(result.questions) == 30
    assert any(item.type == "single_choice" for item in result.questions)
    assert any(item.type == "multiple_choice" for item in result.questions)
    assert any(item.type == "true_false" for item in result.questions)
    assert any(item.type == "concept_analysis" for item in result.questions)
    assert any(item.type == "scenario_analysis" for item in result.questions)
    assert any(item.type == "system_design" for item in result.questions)
    assert any(item.type == "code_reading" for item in result.questions)
    assert not result.errors


def test_parse_personal_question_bank_format() -> None:
    """中文说明：个人题库 YAML 风格格式能解析选项、答案、考察点和解析。"""

    markdown = """
--- question ---

question_id: demo_sc_001
module: Agent 基础与架构
type: single_choice
difficulty: 2
knowledge_points:

* Agent 定义
* 工具调用

stem: |
哪项正确？

options:
A: 错误
B: 正确

answer:

* B

option_analysis:
A: 错误。
B: 正确。

interview_followups:

* 如何判断是否需要 Agent？
"""
    result = parse_markdown_question_bank(markdown)
    question = result.questions[0]
    assert question.id == "demo_sc_001"
    assert question.part_id == "demo_sc_001"
    assert question.type == "single_choice"
    assert question.standard_answer == "B"
    assert question.options[1].text == "正确"
    assert question.exam_points == ["Agent 定义", "工具调用"]


def test_parse_hash_title_and_bold_fields() -> None:
    """中文说明：兼容带 ### 标题和加粗字段名。"""

    markdown = """
### Part 2-015｜单选题｜进阶｜高仿真题

**题目：** 哪个选项正确？

**选项/材料：**
- A. 错误项
- B. 正确项

**标准答案：** B

**详细解析：** 因为 B 正确。
"""
    result = parse_markdown_question_bank(markdown)
    question = result.questions[0]
    assert question.part_id == "Part-2-015"
    assert question.type == "single_choice"
    assert question.options[1].key == "B"


def test_parse_plain_fields_without_hash_title() -> None:
    """中文说明：兼容不带 Markdown 标题符号和非加粗字段。"""

    markdown = """
Part 2-016｜多选题｜基础必会｜高仿真题

题目：哪些属于核心指标？
选项： A. 成本 B. 延迟 C. 稳定性 D. 字体
标准答案：A、B、C
详细解析：前三项是工程指标。
"""
    result = parse_markdown_question_bank(markdown)
    question = result.questions[0]
    assert question.type == "multiple_choice"
    assert [option.key for option in question.options] == ["A", "B", "C", "D"]


def test_preview_warning_and_error() -> None:
    """中文说明：缺解析是 warning，缺答案是 error。"""

    markdown = """
### Part 2-001｜单选题｜基础｜标签
题目：没有解析但能导入？
选项： A. 是 B. 否
标准答案：A

### Part 2-002｜单选题｜基础｜标签
题目：没有答案不能导入？
选项： A. 是 B. 否
"""
    result = parse_markdown_question_bank(markdown)
    assert len(result.questions) == 1
    assert len(result.warnings) == 1
    assert len(result.errors) == 1
