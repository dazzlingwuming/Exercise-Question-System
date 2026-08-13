"""严格解析 ``question-bank-format: v2`` 的 Markdown 题库。

该格式有意只支持一个很小的 YAML 子集：标量、两空格缩进的列表/选项，
以及 ``|`` 多行文本。这样既能让人直接编辑，也能避免 YAML 隐式类型、锚点等
行为让题库导入变得不可预测。
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.parsers.markdown_parser import ParseResult
from app.schemas.import_schema import ImportErrorItem, ImportWarningItem
from app.schemas.question import OptionSchema, QuestionRead
from app.services.question_create_service import TYPE_LABELS
from app.services.question_validation_service import QuestionValidationError, validate_question_for_save


HEADER_PATTERN = re.compile(r"(?mi)^[ \t]*<!--\s*question-bank-format:\s*v2\s*-->[ \t]*$")
DELIMITER_PATTERN = re.compile(r"(?m)^--- question ---[ \t]*$")
FIELD_PATTERN = re.compile(r"^([a-z][a-z0-9_]*):(?:[ ](.*)|[ ]*)$")
QUESTION_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
OPTION_KEY_PATTERN = re.compile(r"^[A-Z]$")
LIST_ITEM_PATTERN = re.compile(r"^-\s+(.+?)\s*$")
OPTION_ITEM_PATTERN = re.compile(r"^([A-Z]):\s*(.+?)\s*$")

ALLOWED_FIELDS = {
    "question_id",
    "title",
    "type",
    "difficulty",
    "tags",
    "directions",
    "exam_points",
    "stem",
    "material",
    "options",
    "answer",
    "reference_answer",
    "explanation",
    "common_mistakes",
    "follow_up_question",
    "scoring_standard",
}
LIST_FIELDS = {"tags", "directions", "exam_points"}
TEXT_FIELDS = {
    "stem",
    "material",
    "reference_answer",
    "explanation",
    "common_mistakes",
    "follow_up_question",
    "scoring_standard",
}
OBJECTIVE_TYPES = {"single_choice", "multiple_choice", "true_false", "fill_blank"}


@dataclass
class V2Block:
    """一个由 v2 分隔符切出的候选题块。"""

    index: int
    start_line: int
    body: str
    raw_text: str


def parse_v2_markdown_question_bank(text: str) -> ParseResult:
    """解析 v2 文件，并为每个格式/业务问题保留准确的题块和字段位置。"""

    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    # UTF-8 BOM 仅允许在文件第一个字符；移除它后按同一套“声明必须首行”规则解析。
    normalized_without_initial_bom = normalized[1:] if normalized.startswith("\ufeff") else normalized
    result = ParseResult(format_version="v2", is_legacy=False)
    header = HEADER_PATTERN.search(normalized_without_initial_bom)
    if not header:
        result.errors.append(_file_error("缺少格式声明：<!-- question-bank-format: v2 -->", "format"))
        return result

    if header.start() != 0:
        result.errors.append(
            _file_error(
                "格式声明必须放在文件首行：<!-- question-bank-format: v2 -->",
                "format",
                normalized_without_initial_bom[: header.end()],
            )
        )
        return result

    delimiters = list(DELIMITER_PATTERN.finditer(normalized_without_initial_bom))
    if not delimiters:
        result.errors.append(_file_error("至少需要一个单独一行的 --- question --- 题块分隔符", "format"))
        return result

    preamble = normalized_without_initial_bom[header.end() : delimiters[0].start()]
    if not _is_allowed_preamble(preamble):
        result.errors.append(
            _file_error("格式声明和第一题之间只能放一个可选 Markdown 标题，不能放导语或字段", "format", preamble)
        )

    seen_question_ids: set[str] = set()
    for index, delimiter in enumerate(delimiters, start=1):
        end = delimiters[index].start() if index < len(delimiters) else len(normalized_without_initial_bom)
        raw_text = normalized_without_initial_bom[delimiter.start() : end].strip()
        body = normalized_without_initial_bom[delimiter.end() : end]
        block = V2Block(
            index=index,
            start_line=normalized_without_initial_bom.count("\n", 0, delimiter.start()) + 1,
            body=body,
            raw_text=raw_text,
        )
        raw_question_id = _question_id_from_raw(body)
        duplicate_id = bool(raw_question_id and raw_question_id in seen_question_ids)
        if raw_question_id:
            seen_question_ids.add(raw_question_id)
        question, warnings, errors = _parse_block(block)
        result.warnings.extend(warnings)
        result.errors.extend(_dedupe_errors(errors))
        if duplicate_id:
            result.errors.append(
                _error(block, raw_question_id, "question_id", f"question_id 在同一文件中重复：{raw_question_id}")
            )
            continue
        if question is None:
            continue
        result.questions.append(question)
    return result


def _is_allowed_preamble(text: str) -> bool:
    """仅允许空白或一个 Markdown 标题作为题库标题。"""

    meaningful = [line.strip() for line in text.splitlines() if line.strip()]
    return not meaningful or (len(meaningful) == 1 and bool(re.fullmatch(r"#{1,6}\s+.+", meaningful[0])))


def _parse_block(block: V2Block) -> tuple[QuestionRead | None, list[ImportWarningItem], list[ImportErrorItem]]:
    fields, syntax_issues = _parse_fields(block)
    question_id = _as_text(fields.get("question_id")) or _question_id_from_raw(block.body)
    errors = [_error(block, question_id, field, message) for field, message in syntax_issues]
    warnings: list[ImportWarningItem] = []

    for required_field in ("question_id", "type", "difficulty", "stem"):
        if not _as_text(fields.get(required_field)):
            errors.append(_error(block, question_id, required_field, f"缺少必填字段：{required_field}"))

    if question_id and not QUESTION_ID_PATTERN.fullmatch(question_id):
        errors.append(_error(block, question_id, "question_id", "question_id 必须是小写英文开头，只包含小写字母、数字和下划线"))

    question_type = _as_text(fields.get("type"))
    if question_type and question_type not in TYPE_LABELS:
        errors.append(_error(block, question_id, "type", f"不支持的题型：{question_type}"))

    difficulty = _parse_difficulty(fields.get("difficulty"), block, question_id, errors)
    for field_name in LIST_FIELDS:
        _validate_list_field(fields.get(field_name), field_name, block, question_id, errors)

    if question_type in TYPE_LABELS:
        _validate_type_specific_fields(fields, question_type, block, question_id, errors)

    for field_name, message in (
        ("tags", "建议补充 tags，便于后续筛选题库"),
        ("directions", "建议补充 directions，便于按练习方向组织"),
        ("exam_points", "建议补充 exam_points，便于知识点统计"),
        ("explanation", "缺少 explanation，练习后的复盘体验会受影响"),
    ):
        if _is_empty(fields.get(field_name)):
            warnings.append(_warning(question_id, field_name, message))

    if errors or not question_id or not question_type or difficulty is None:
        return None, warnings, errors

    options = _options_as_list(fields.get("options"))
    standard_answer = _standard_answer_for_type(fields, question_type)
    question_data: dict[str, Any] = {
        "type": question_type,
        "stem": _as_text(fields.get("stem")),
        "options": options,
        "standard_answer": standard_answer,
        "scoring_standard": _as_text(fields.get("scoring_standard")) or None,
    }
    try:
        validate_question_for_save(question_data)
    except QuestionValidationError as exc:
        errors.append(_error(block, question_id, _validation_field(question_type), str(exc)))
        return None, warnings, errors

    answer_text = _answer_text(standard_answer, question_type)
    question = QuestionRead(
        id=question_id,
        part_id=question_id,
        title=_as_text(fields.get("title")) or question_id,
        type=question_type,
        type_label=TYPE_LABELS[question_type],
        difficulty=str(difficulty),
        tags=_list_value(fields.get("tags")),
        directions=_list_value(fields.get("directions")),
        stem=_as_text(fields.get("stem")),
        material=_as_text(fields.get("material")) or None,
        options=[OptionSchema(**option) for option in options],
        standard_answer=standard_answer,
        answer_text=answer_text,
        explanation=_as_text(fields.get("explanation")) or None,
        exam_points=_list_value(fields.get("exam_points")),
        common_mistakes=_as_text(fields.get("common_mistakes")) or None,
        follow_up_question=_as_text(fields.get("follow_up_question")) or None,
        scoring_standard=_as_text(fields.get("scoring_standard")) or None,
        source_text=block.raw_text,
        parse_warnings=[warning.message for warning in warnings],
    )
    return question, warnings, errors


def _parse_fields(block: V2Block) -> tuple[dict[str, object], list[tuple[str | None, str]]]:
    """解析有限字段语法，保留所有可定位的格式问题而非静默猜测。"""

    lines = block.body.splitlines()
    fields: dict[str, object] = {}
    issues: list[tuple[str | None, str]] = []
    cursor = 0
    while cursor < len(lines):
        line = lines[cursor]
        if not line.strip():
            cursor += 1
            continue
        if _has_tab_indentation(line):
            issues.append((None, "不支持 Tab 缩进；请统一使用两个空格"))
            cursor += 1
            continue
        if line.startswith(" "):
            issues.append((None, "顶层字段不能缩进；请从行首开始写 field_name:"))
            cursor += 1
            continue

        match = FIELD_PATTERN.match(line)
        if not match:
            issues.append((None, f"无法识别的顶层内容：{line.strip()[:80]}"))
            cursor += 1
            continue

        key, inline_value = match.group(1), (match.group(2) or "").strip()
        if key not in ALLOWED_FIELDS:
            issues.append((key, f"不支持字段：{key}"))
        if key in fields:
            issues.append((key, f"字段重复：{key}"))

        cursor += 1
        if inline_value == "|":
            value, cursor, literal_issues = _consume_literal(lines, cursor)
            issues.extend((key, message) for message in literal_issues)
            fields[key] = value
            continue

        if inline_value:
            if key in LIST_FIELDS or key == "options":
                issues.append((key, f"{key} 必须使用下一行起的两空格缩进列表/字典，不能写成行内值"))
            fields[key] = inline_value
            continue

        nested, cursor, nested_issues = _consume_nested(lines, cursor, block.start_line)
        issues.extend((key, message) for message in nested_issues)
        fields[key] = _parse_empty_value(key, nested, issues)

    return fields, issues


def _consume_literal(lines: list[str], cursor: int) -> tuple[str, int, list[str]]:
    collected: list[str] = []
    issues: list[str] = []
    saw_content = False
    while cursor < len(lines) and not _is_top_level_field(lines[cursor]):
        line = lines[cursor]
        if not line.strip():
            collected.append("")
        elif line.startswith("  "):
            saw_content = True
            collected.append(line[2:])
        else:
            issues.append("多行内容必须统一缩进两个空格")
            collected.append(line)
        cursor += 1
    if not saw_content:
        issues.append("多行字段使用 | 后必须提供至少一行两空格缩进的内容")
    return "\n".join(collected).strip(), cursor, issues


def _consume_nested(lines: list[str], cursor: int, block_start_line: int) -> tuple[list[str], int, list[str]]:
    collected: list[str] = []
    issues: list[str] = []
    first_unindented_line: tuple[int, str] | None = None
    saw_tab_indentation = False
    while cursor < len(lines) and not _is_top_level_field(lines[cursor]):
        line = lines[cursor]
        if not line.strip():
            cursor += 1
            continue
        if _has_tab_indentation(line):
            saw_tab_indentation = True
        elif not line.startswith("  "):
            if first_unindented_line is None:
                first_unindented_line = (block_start_line + cursor, line.strip())
        else:
            collected.append(line[2:])
        cursor += 1
    if saw_tab_indentation:
        issues.append("不支持 Tab 缩进；请统一使用两个空格")
    if first_unindented_line:
        line_number, example = first_unindented_line
        issues.append(
            f"第 {line_number} 行未缩进的嵌套列表/选项：{example[:80]}；"
            "列表、选项和多行内容必须使用两个空格缩进（例如：  - 标签）"
        )
    return collected, cursor, issues


def _parse_empty_value(key: str, nested: list[str], issues: list[tuple[str | None, str]]) -> object:
    if key in LIST_FIELDS or key == "answer":
        values: list[str] = []
        for line in nested:
            match = LIST_ITEM_PATTERN.match(line)
            if not match:
                issues.append((key, f"{key} 的每一项都必须写成 - 内容"))
                continue
            values.append(match.group(1).strip())
        return values
    if key == "options":
        options: dict[str, str] = {}
        for line in nested:
            match = OPTION_ITEM_PATTERN.match(line)
            if not match:
                issues.append((key, "options 必须写成 A: 选项内容 的形式"))
                continue
            option_key, option_text = match.groups()
            if option_key in options:
                issues.append((key, f"选项键重复：{option_key}"))
                continue
            options[option_key] = option_text.strip()
        return options
    if nested:
        issues.append((key, f"{key} 的多行文本必须写成 {key}: |"))
    return ""


def _validate_type_specific_fields(
    fields: dict[str, object],
    question_type: str,
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> None:
    options_raw = fields.get("options")
    options = _options_as_list(options_raw)
    answer = fields.get("answer")
    reference_answer = _as_text(fields.get("reference_answer"))
    scoring_standard = _as_text(fields.get("scoring_standard"))

    if question_type == "single_choice":
        _validate_options_count(options, 2, 6, block, question_id, errors)
        if not isinstance(answer, str) or not answer.strip():
            errors.append(_error(block, question_id, "answer", "单选题的 answer 必须是一个选项键，例如 answer: A"))
        elif answer.strip().upper() not in {option["key"] for option in options}:
            errors.append(_error(block, question_id, "answer", "单选题答案必须恰好匹配一个已有选项键"))
        _reject_objective_extras(fields, block, question_id, errors)
        return

    if question_type == "multiple_choice":
        _validate_options_count(options, 2, 8, block, question_id, errors)
        if not isinstance(answer, list) or len(answer) < 2:
            errors.append(_error(block, question_id, "answer", "多选题的 answer 必须是包含至少两个选项键的列表"))
        else:
            normalized = [str(item).strip().upper() for item in answer]
            if len(normalized) != len(set(normalized)):
                errors.append(_error(block, question_id, "answer", "多选题答案不能重复"))
            if any(item not in {option["key"] for option in options} for item in normalized):
                errors.append(_error(block, question_id, "answer", "多选题答案必须全部属于已有选项"))
        _reject_objective_extras(fields, block, question_id, errors)
        return

    if question_type == "true_false":
        _require_no_options(options_raw, block, question_id, errors)
        if not isinstance(answer, str) or answer.strip() not in {"正确", "错误"}:
            errors.append(_error(block, question_id, "answer", "判断题答案只能是 answer: 正确 或 answer: 错误"))
        _reject_objective_extras(fields, block, question_id, errors)
        return

    if question_type == "fill_blank":
        _require_no_options(options_raw, block, question_id, errors)
        if not isinstance(answer, list) or not [item for item in answer if str(item).strip()]:
            errors.append(_error(block, question_id, "answer", "填空题的 answer 必须是至少包含一个可接受答案的列表"))
        _reject_objective_extras(fields, block, question_id, errors)
        return

    _require_no_options(options_raw, block, question_id, errors)
    if not _is_empty(answer):
        errors.append(_error(block, question_id, "answer", "主观题不使用 answer，请改用 reference_answer"))
    if not reference_answer:
        errors.append(_error(block, question_id, "reference_answer", "主观题必须提供 reference_answer"))
    if not scoring_standard:
        errors.append(_error(block, question_id, "scoring_standard", "主观题必须提供 scoring_standard"))


def _validate_options_count(
    options: list[dict[str, str]],
    minimum: int,
    maximum: int,
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> None:
    if not minimum <= len(options) <= maximum:
        errors.append(_error(block, question_id, "options", f"该题型必须提供 {minimum}–{maximum} 个选项"))
    for option in options:
        if not OPTION_KEY_PATTERN.fullmatch(option["key"]):
            errors.append(_error(block, question_id, "options", f"选项键必须是单个大写字母：{option['key']}"))


def _require_no_options(
    raw_options: object,
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> None:
    if raw_options is not None:
        errors.append(_error(block, question_id, "options", "该题型不应包含 options 字段"))


def _reject_objective_extras(
    fields: dict[str, object],
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> None:
    for field_name in ("reference_answer", "scoring_standard"):
        if not _is_empty(fields.get(field_name)):
            errors.append(_error(block, question_id, field_name, f"客观题不应包含 {field_name}"))


def _parse_difficulty(
    value: object,
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> int | None:
    raw = _as_text(value)
    if not raw:
        return None
    if not re.fullmatch(r"[1-5]", raw):
        errors.append(_error(block, question_id, "difficulty", "difficulty 必须是 1 到 5 的整数"))
        return None
    return int(raw)


def _validate_list_field(
    value: object,
    field_name: str,
    block: V2Block,
    question_id: str | None,
    errors: list[ImportErrorItem],
) -> None:
    if value is None:
        return
    if not isinstance(value, list):
        errors.append(_error(block, question_id, field_name, f"{field_name} 必须是 - 内容 形式的列表"))
        return
    if any(not str(item).strip() for item in value):
        errors.append(_error(block, question_id, field_name, f"{field_name} 不能包含空列表项"))


def _standard_answer_for_type(fields: dict[str, object], question_type: str) -> Any:
    if question_type in {"multiple_choice", "fill_blank"}:
        return [str(item).strip() for item in _list_value(fields.get("answer"))]
    if question_type in OBJECTIVE_TYPES:
        return _as_text(fields.get("answer")).strip()
    return _as_text(fields.get("reference_answer")).strip()


def _answer_text(answer: Any, question_type: str) -> str:
    if isinstance(answer, list):
        separator = "、" if question_type == "multiple_choice" else " / "
        return separator.join(str(item) for item in answer)
    return str(answer)


def _validation_field(question_type: str) -> str:
    if question_type in {"single_choice", "multiple_choice", "true_false", "fill_blank"}:
        return "answer"
    return "reference_answer"


def _options_as_list(value: object) -> list[dict[str, str]]:
    if not isinstance(value, dict):
        return []
    return [{"key": str(key).strip().upper(), "text": str(text).strip()} for key, text in value.items()]


def _list_value(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _as_text(value: object) -> str:
    return str(value).strip() if isinstance(value, str) else ""


def _is_empty(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, list):
        return not any(str(item).strip() for item in value)
    if isinstance(value, dict):
        return not value
    return not str(value).strip()


def _is_top_level_field(line: str) -> bool:
    return not line.startswith((" ", "\t")) and bool(FIELD_PATTERN.match(line))


def _has_tab_indentation(line: str) -> bool:
    leading = line[: len(line) - len(line.lstrip(" \t"))]
    return "\t" in leading


def _question_id_from_raw(body: str) -> str | None:
    match = re.search(r"(?m)^question_id:\s*([^\n]+)", body)
    return match.group(1).strip() if match else None


def _warning(question_id: str | None, field: str, message: str) -> ImportWarningItem:
    return ImportWarningItem(question_id=question_id, part_id=question_id, field=field, message=message)


def _error(block: V2Block, question_id: str | None, field: str | None, message: str) -> ImportErrorItem:
    return ImportErrorItem(
        index=block.index,
        part_id=question_id,
        question_id=question_id,
        field=field,
        message=message,
        raw_text_preview=_preview(block.raw_text),
    )


def _dedupe_errors(errors: list[ImportErrorItem]) -> list[ImportErrorItem]:
    """每题同一字段的同一语法/校验错误只显示一次，保留第一个定位结果。"""

    unique: list[ImportErrorItem] = []
    seen: set[tuple[str | None, str | None, str]] = set()
    for error in errors:
        key = (error.question_id, error.field, error.message)
        if key not in seen:
            seen.add(key)
            unique.append(error)
    return unique


def _file_error(message: str, field: str, raw_text: str = "") -> ImportErrorItem:
    return ImportErrorItem(
        index=0,
        part_id=None,
        question_id=None,
        field=field,
        message=message,
        raw_text_preview=_preview(raw_text),
    )


def _preview(text: str) -> str:
    compact = text.strip()
    return compact[:400] if compact else "（无可预览原文）"
