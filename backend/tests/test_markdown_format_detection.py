"""回归下载题库常见的“漏 v2 声明/漏缩进”格式问题。"""

from app.parsers.markdown_parser import parse_markdown_question_bank


DOWNLOADED_V2_FRAGMENT = """--- question ---
question_id: q_download_sc_001
type: single_choice
difficulty: 2
tags:
  - 下载文件
directions:
  - 导入
exam_points:
  - 格式声明
stem: |
  哪项配置正确？
options:
  A: 未声明 header
  B: 声明在首行
answer: B
explanation: |
  v2 文件必须显式声明格式。
"""


def test_headerless_near_v2_is_blocked_instead_of_falling_back_to_legacy() -> None:
    result = parse_markdown_question_bank(DOWNLOADED_V2_FRAGMENT)

    assert result.format_version == "v2"
    assert result.is_legacy is False
    assert not result.questions
    assert len(result.errors) == 1
    assert result.errors[0].field == "format"
    assert "已阻止按旧格式解析" in result.errors[0].message
    assert "<!-- question-bank-format: v2 -->" in result.errors[0].message
    assert "文件首行" in result.errors[0].message


def test_headerless_near_v2_also_reports_first_unindented_nested_item() -> None:
    result = parse_markdown_question_bank(
        DOWNLOADED_V2_FRAGMENT.replace("  - 下载文件", "- 下载文件\n- 重复的错误项")
    )

    assert len(result.errors) == 2
    assert result.errors[0].field == "format"
    indentation_error = result.errors[1]
    assert indentation_error.field == "tags"
    assert "第 6 行" in indentation_error.message
    assert "- 下载文件" in indentation_error.message
    assert "两个空格缩进" in indentation_error.message


def test_v2_unindented_nested_list_reports_first_line_once_per_field() -> None:
    text = "<!-- question-bank-format: v2 -->\n\n" + DOWNLOADED_V2_FRAGMENT.replace(
        "  - 下载文件", "- 下载文件\n- 重复的错误项"
    )

    result = parse_markdown_question_bank(text)

    tag_errors = [error for error in result.errors if error.field == "tags"]
    assert len(tag_errors) == 1
    assert "第 8 行" in tag_errors[0].message
    assert "- 下载文件" in tag_errors[0].message
    assert "两个空格缩进" in tag_errors[0].message


def test_v2_header_and_two_space_indentation_parse_downloaded_fragment() -> None:
    result = parse_markdown_question_bank("<!-- question-bank-format: v2 -->\n\n" + DOWNLOADED_V2_FRAGMENT)

    assert not result.errors
    assert [question.id for question in result.questions] == ["q_download_sc_001"]


def test_v2_accepts_only_an_initial_utf8_bom_before_the_header() -> None:
    result = parse_markdown_question_bank("\ufeff<!-- question-bank-format: v2 -->\n\n" + DOWNLOADED_V2_FRAGMENT)

    assert not result.errors
    assert [question.id for question in result.questions] == ["q_download_sc_001"]


def test_v2_rejects_a_blank_line_between_initial_bom_and_header() -> None:
    result = parse_markdown_question_bank("\ufeff\n<!-- question-bank-format: v2 -->\n\n" + DOWNLOADED_V2_FRAGMENT)

    assert not result.questions
    assert len(result.errors) == 1
    assert result.errors[0].field == "format"
    assert "文件首行" in result.errors[0].message


def test_legacy_personal_fixture_remains_compatible() -> None:
    legacy = """--- question ---
question_id: legacy_lowercase_001
module: 历史题库
type: single_choice
difficulty: 2
knowledge_points:
  - 兼容性
stem: |
  历史格式仍可读取吗？
options:
  A: 可以
  B: 不可以
answer:
  - A
option_analysis:
  A: 可以。
"""

    result = parse_markdown_question_bank(legacy)

    assert result.format_version == "legacy"
    assert result.is_legacy is True
    assert [question.id for question in result.questions] == ["legacy_lowercase_001"]
