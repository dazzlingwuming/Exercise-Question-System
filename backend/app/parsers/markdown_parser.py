"""中文说明：将现有 Markdown 题库解析为结构化题目、警告和错误。"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.parsers.field_parser import clean_markdown_text, parse_field_line, parse_options, split_exam_points
from app.schemas.import_schema import ImportErrorItem, ImportWarningItem
from app.schemas.question import OptionSchema, QuestionRead, QuestionType


TYPE_MAP = {
    "单选题": QuestionType.single_choice,
    "多选题": QuestionType.multiple_choice,
    "判断题": QuestionType.true_false,
    "填空题": QuestionType.fill_blank,
    "简答题": QuestionType.short_answer,
    "问答题": QuestionType.short_answer,
    "论述题": QuestionType.essay,
    "流程排序题": QuestionType.flow_order,
    "概念辨析题": QuestionType.concept_analysis,
    "场景分析题": QuestionType.scenario_analysis,
    "面试题": QuestionType.interview,
    "Debug / 日志分析题": QuestionType.debug_analysis,
    "代码阅读 / 伪代码设计题": QuestionType.code_reading,
    "系统设计题": QuestionType.system_design,
    "项目追问模拟": QuestionType.project_follow_up,
    "模拟面试套卷": QuestionType.mock_interview,
}

PERSONAL_TYPE_MAP = {
    "single_choice": (QuestionType.single_choice, "单选题"),
    "multiple_choice": (QuestionType.multiple_choice, "多选题"),
    "true_false": (QuestionType.true_false, "判断题"),
    "concept_compare": (QuestionType.concept_analysis, "概念辨析题"),
    "scenario_debug": (QuestionType.scenario_analysis, "场景分析题"),
    "system_design": (QuestionType.system_design, "系统设计题"),
    "coding_or_pseudocode": (QuestionType.code_reading, "代码阅读 / 伪代码设计题"),
}

PERSONAL_FIELD_NAMES = {
    "question_id",
    "module",
    "type",
    "difficulty",
    "knowledge_points",
    "stem",
    "options",
    "answer",
    "option_analysis",
    "reference_answer",
    "answer_keywords",
    "scoring_points",
    "interview_followups",
    "architecture_points",
    "data_flow",
    "evaluation_metrics",
    "risk_points",
    "pseudocode",
    "complexity",
    "test_cases",
}


@dataclass
class ParseResult:
    """中文说明：解析器统一返回结构，包含可导入题目、警告和错误。"""

    questions: list[QuestionRead] = field(default_factory=list)
    warnings: list[ImportWarningItem] = field(default_factory=list)
    errors: list[ImportErrorItem] = field(default_factory=list)


@dataclass
class RawBlock:
    """中文说明：表示从 Markdown 中切出来的一道候选题目原始块。"""

    index: int
    title: str
    body: str
    raw_text: str
    source_kind: str


def map_question_type(type_label: str) -> QuestionType:
    """中文说明：将中文题型映射为内部枚举，未知题型保留为 unknown。"""

    return TYPE_MAP.get(type_label.strip(), QuestionType.unknown)


def parse_markdown_question_bank(text: str) -> ParseResult:
    """中文说明：解析完整 Markdown 题库，先切题块，再逐题抽取字段和校验。"""

    blocks = _split_blocks(text)
    result = ParseResult()
    for block in blocks:
        question, warnings, error = _parse_block(block)
        if error:
            result.errors.append(error)
            continue
        result.questions.append(question)
        result.warnings.extend(warnings)
    return result


def _split_blocks(text: str) -> list[RawBlock]:
    """中文说明：兼容两类题块：结构化 Part 标题和开头的“题 N【难度】”。"""

    normalized = text.replace("\r\n", "\n")
    if re.search(r"(?m)^--- question ---\s*$", normalized):
        return _split_personal_blocks(normalized)
    structured_matches = list(re.finditer(r"(?m)^(?:#{1,6}\s*)?(Part\s+\d+-\d+\s*｜.+?)\s*$", normalized))
    blocks: list[RawBlock] = []

    first_structured_start = structured_matches[0].start() if structured_matches else len(normalized)
    prefix = normalized[:first_structured_start]
    classic_matches = list(re.finditer(r"(?m)^\*\*题\s*(\d+)【(.+?)】\*\*\s*$", prefix))
    for index, match in enumerate(classic_matches):
        start = match.end()
        end = classic_matches[index + 1].start() if index + 1 < len(classic_matches) else len(prefix)
        title = f"题 {match.group(1)}【{match.group(2)}】"
        raw = prefix[match.start():end].strip()
        blocks.append(RawBlock(len(blocks) + 1, title, prefix[start:end], raw, "classic"))

    for index, match in enumerate(structured_matches):
        start = match.end()
        end = structured_matches[index + 1].start() if index + 1 < len(structured_matches) else len(normalized)
        title = clean_markdown_text(match.group(1))
        raw = normalized[match.start():end].strip()
        blocks.append(RawBlock(len(blocks) + 1, title, normalized[start:end], raw, "part"))
    return blocks


def _split_personal_blocks(normalized: str) -> list[RawBlock]:
    """中文说明：解析 data/个人题库 中以 --- question --- 分隔的 YAML 风格题块。"""

    pieces = re.split(r"(?m)^--- question ---\s*$", normalized)
    blocks: list[RawBlock] = []
    for piece in pieces:
        raw = piece.strip()
        if not raw:
            continue
        question_id_match = re.search(r"(?m)^question_id:\s*(.+)$", raw)
        title = question_id_match.group(1).strip() if question_id_match else f"personal-{len(blocks) + 1}"
        blocks.append(RawBlock(len(blocks) + 1, title, raw, raw, "personal"))
    return blocks


def _parse_block(block: RawBlock) -> tuple[QuestionRead | None, list[ImportWarningItem], ImportErrorItem | None]:
    """中文说明：解析单个题块，并把缺字段等问题转换成 warning 或 error。"""

    if block.source_kind == "personal":
        return _parse_personal_block(block)

    meta = _parse_title(block)
    fields = _parse_fields(block.body)
    warnings: list[ImportWarningItem] = []

    stem = fields.get("stem") or _fallback_stem(block.body)
    answer = fields.get("standard_answer")
    explanation = fields.get("explanation")
    options = parse_options(fields.get("options", ""))

    if not stem:
        return None, warnings, _make_error(block, meta["part_id"], "缺少题干，无法导入")
    if not answer:
        return None, warnings, _make_error(block, meta["part_id"], "缺少标准答案或参考答案，无法导入")

    question_type = map_question_type(meta["type_label"])
    if question_type in {QuestionType.single_choice, QuestionType.multiple_choice} and not options:
        warnings.append(_make_warning(meta["question_id"], meta["part_id"], "选择题未识别到选项"))
    if question_type == QuestionType.unknown:
        warnings.append(_make_warning(meta["question_id"], meta["part_id"], f"未知题型：{meta['type_label']}"))
    if not explanation:
        warnings.append(_make_warning(meta["question_id"], meta["part_id"], "缺少详细解析"))

    question = QuestionRead(
        id=meta["question_id"],
        part_id=meta["part_id"],
        title=block.title,
        type=question_type.value,
        type_label=meta["type_label"],
        difficulty=meta["difficulty"],
        tags=meta["tags"],
        stem=stem,
        material=fields.get("material"),
        options=[OptionSchema(**item) for item in options],
        standard_answer=answer,
        answer_text=str(answer),
        explanation=explanation,
        exam_points=split_exam_points(fields.get("exam_points")),
        common_mistakes=fields.get("common_mistakes"),
        follow_up_question=fields.get("follow_up_question"),
        scoring_standard=fields.get("scoring_standard"),
        source_text=block.raw_text,
        parse_warnings=[warning.message for warning in warnings],
    )
    return question, warnings, None


def _parse_personal_block(block: RawBlock) -> tuple[QuestionRead | None, list[ImportWarningItem], ImportErrorItem | None]:
    """中文说明：解析新个人题库格式，并转换为系统统一 QuestionRead。"""

    fields = _parse_personal_fields(block.body)
    question_id = fields.get("question_id", f"personal-{block.index}")
    raw_type = fields.get("type", "unknown")
    question_type, type_label = PERSONAL_TYPE_MAP.get(raw_type, (QuestionType.unknown, raw_type))
    module = fields.get("module", "个人题库")
    knowledge_points = _as_list(fields.get("knowledge_points"))
    answer_list = _as_list(fields.get("answer"))
    reference_answer = str(fields.get("reference_answer") or "").strip()
    stem = str(fields.get("stem") or "").strip()
    standard_answer = _standard_answer(question_type, answer_list, reference_answer)
    warnings: list[ImportWarningItem] = []

    if not stem:
        return None, warnings, _make_error(block, question_id, "缺少题干，无法导入")
    if not standard_answer:
        return None, warnings, _make_error(block, question_id, "缺少标准答案或参考答案，无法导入")
    if question_type == QuestionType.unknown:
        warnings.append(_make_warning(question_id, question_id, f"未知题型：{raw_type}"))

    explanation = _compose_personal_explanation(fields)
    options = _parse_personal_options(fields.get("options"))
    scoring_standard = _join_named_sections(fields, ["scoring_points", "answer_keywords"])
    question = QuestionRead(
        id=question_id,
        part_id=question_id,
        title=f"{module}｜{type_label}｜难度 {fields.get('difficulty', '')}".strip("｜"),
        type=question_type.value,
        type_label=type_label,
        difficulty=str(fields.get("difficulty") or ""),
        tags=[module],
        directions=[module],
        stem=stem,
        material=None,
        options=[OptionSchema(**item) for item in options],
        standard_answer=standard_answer,
        answer_text=str(standard_answer),
        explanation=explanation,
        exam_points=knowledge_points,
        common_mistakes=None,
        follow_up_question=_bullet_text(fields.get("interview_followups")),
        scoring_standard=scoring_standard or None,
        source_text=block.raw_text,
        parse_warnings=[warning.message for warning in warnings],
    )
    return question, warnings, None


def _parse_personal_fields(body: str) -> dict[str, object]:
    """中文说明：解析 YAML 风格但不依赖额外库，支持 scalar/list/literal/map。"""

    lines = body.splitlines()
    fields: dict[str, object] = {}
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if not match:
            index += 1
            continue
        key, value = match.group(1), match.group(2).strip()
        index += 1
        if value == "|":
            collected: list[str] = []
            while index < len(lines) and not _is_personal_field_line(lines[index]):
                collected.append(lines[index][2:] if lines[index].startswith("  ") else lines[index])
                index += 1
            fields[key] = "\n".join(collected).strip()
        elif value:
            fields[key] = clean_markdown_text(value)
        else:
            collected = []
            while index < len(lines) and not _is_personal_field_line(lines[index]):
                collected.append(lines[index])
                index += 1
            fields[key] = _parse_personal_section(collected)
    return fields


def _is_personal_field_line(line: str) -> bool:
    """中文说明：只把个人题库的已知字段识别为顶层字段，避免 A: 选项被误判。"""

    match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*", line)
    return bool(match and match.group(1) in PERSONAL_FIELD_NAMES)


def _parse_personal_section(lines: list[str]) -> object:
    """中文说明：把空值后的缩进块解析成列表、键值表或文本。"""

    non_empty = [line.rstrip() for line in lines if line.strip()]
    if not non_empty:
        return ""
    if all(line.lstrip().startswith(("* ", "- ")) for line in non_empty):
        return [clean_markdown_text(line.lstrip()[2:]) for line in non_empty]
    key_values: dict[str, str] = {}
    for line in non_empty:
        match = re.match(r"^\s*([A-Z]|[A-Za-z_][A-Za-z0-9_ -]*):\s*(.*)$", line)
        if not match:
            return "\n".join(clean_markdown_text(line) for line in non_empty)
        key_values[match.group(1).strip()] = clean_markdown_text(match.group(2))
    return key_values


def _parse_personal_options(raw: object) -> list[dict[str, str]]:
    """中文说明：解析个人题库中的 A: 文本选项结构。"""

    if not isinstance(raw, dict):
        return []
    return [{"key": str(key).strip().upper(), "text": str(value).strip()} for key, value in raw.items()]


def _standard_answer(question_type: QuestionType, answer_list: list[str], reference_answer: str) -> str:
    """中文说明：客观题使用 answer 列表，主观题使用 reference_answer。"""

    if question_type in {QuestionType.single_choice, QuestionType.multiple_choice, QuestionType.true_false}:
        return "、".join(answer_list)
    return reference_answer


def _compose_personal_explanation(fields: dict[str, object]) -> str | None:
    """中文说明：把个人题库中的解析、架构、伪代码、风险等字段合并为详细解析。"""

    names = [
        "option_analysis",
        "reference_answer",
        "architecture_points",
        "data_flow",
        "evaluation_metrics",
        "risk_points",
        "pseudocode",
        "complexity",
        "test_cases",
    ]
    parts: list[str] = []
    for name in names:
        value = fields.get(name)
        text = _section_to_text(value)
        if text:
            parts.append(f"{name}:\n{text}")
    return "\n\n".join(parts) if parts else None


def _join_named_sections(fields: dict[str, object], names: list[str]) -> str:
    """中文说明：把若干字段合并为评分标准文本。"""

    parts = []
    for name in names:
        text = _section_to_text(fields.get(name))
        if text:
            parts.append(f"{name}:\n{text}")
    return "\n\n".join(parts)


def _section_to_text(value: object) -> str:
    """中文说明：将解析后的列表/字典/字符串转成人可读文本。"""

    if value is None:
        return ""
    if isinstance(value, list):
        return "\n".join(f"- {item}" for item in value)
    if isinstance(value, dict):
        return "\n".join(f"{key}: {item}" for key, item in value.items())
    return str(value).strip()


def _bullet_text(value: object) -> str | None:
    text = _section_to_text(value)
    return text or None


def _as_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None or value == "":
        return []
    return [str(value).strip()]


def _parse_title(block: RawBlock) -> dict[str, Any]:
    """中文说明：从题块标题中解析 part_id、题型、难度和标签。"""

    if block.source_kind == "part":
        pieces = [piece.strip() for piece in block.title.split("｜")]
        part_id = pieces[0].replace(" ", "-")
        type_label = pieces[1] if len(pieces) > 1 else "unknown"
        difficulty = pieces[2] if len(pieces) > 2 else None
        tags = pieces[3:] if len(pieces) > 3 else []
        question_id = f"q-{part_id.lower()}"
        return {"part_id": part_id, "question_id": question_id, "type_label": type_label, "difficulty": difficulty, "tags": tags}

    match = re.search(r"题\s*(\d+)【(.+?)】", block.title)
    number = match.group(1) if match else str(block.index)
    difficulty = match.group(2) if match else None
    type_label = _infer_classic_type(block.body)
    part_id = f"Part-1-{int(number):03d}"
    return {
        "part_id": part_id,
        "question_id": f"q-{part_id.lower()}",
        "type_label": type_label,
        "difficulty": difficulty,
        "tags": ["首批笔试题"],
    }


def _infer_classic_type(body: str) -> str:
    """中文说明：Part 1 没有逐题标题题型时，根据选项和答案形态推断题型。"""

    answer_match = re.search(r"标准答案[：:]\s*([^\n]+)", body)
    answer = answer_match.group(1).strip() if answer_match else ""
    if "选项" in body:
        letters = re.findall(r"[A-E]", answer.upper())
        return "多选题" if len(set(letters)) > 1 else "单选题"
    if answer in {"正确", "错误", "对", "错"}:
        return "判断题"
    return "简答题"


def _parse_fields(body: str) -> dict[str, str]:
    """中文说明：逐行解析字段，字段内容可跨多行直到下一个字段出现。"""

    label_names = "|".join(re.escape(name) for name in sorted(TYPE_FIELD_NAMES, key=len, reverse=True))
    prepared_body = re.sub(rf"\s+(?=(?:\*\*)?(?:{label_names})(?:\*\*)?\s*[：:])", "\n", body)
    fields: dict[str, list[str]] = {}
    current: str | None = None
    for line in prepared_body.splitlines():
        parsed = parse_field_line(line)
        if parsed:
            current, value = parsed
            fields.setdefault(current, [])
            if value:
                fields[current].append(value)
            continue
        if current and line.strip():
            fields[current].append(clean_markdown_text(line))
    return {key: "\n".join(value).strip() for key, value in fields.items()}


TYPE_FIELD_NAMES = {
    "题目",
    "题目背景",
    "套卷主题",
    "选项",
    "选项/材料",
    "材料",
    "问题现象",
    "日志/线索",
    "排查路径",
    "需求澄清",
    "核心约束",
    "假设的项目描述",
    "面试官问题",
    "问题背后的考察点",
    "标准答案",
    "答案",
    "参考答案",
    "最优答案",
    "答案要点",
    "参考答案要点",
    "架构设计",
    "数据流",
    "模块职责",
    "关键技术取舍",
    "安全与权限",
    "评估指标",
    "失败处理",
    "成本与延迟优化",
    "简短回答版本",
    "深入回答版本",
    "优秀回答",
    "高质量回答",
    "回答策略",
    "详细解析",
    "解析",
    "工程落地注意点",
    "考察点",
    "常见错误",
    "常见误判",
    "常见错误方案",
    "低质量回答",
    "面试延伸追问",
    "面试官追问链",
    "进一步追问",
    "评分标准",
    "优秀点",
}


def _fallback_stem(body: str) -> str:
    """中文说明：当字段解析失败时，从题块正文前几行保守提取题干。"""

    for line in body.splitlines():
        text = clean_markdown_text(line)
        if text and not parse_field_line(line):
            return text
    return ""


def _make_warning(question_id: str | None, part_id: str | None, message: str) -> ImportWarningItem:
    """中文说明：构造统一 warning，便于导入预览页展示。"""

    return ImportWarningItem(question_id=question_id, part_id=part_id, message=message)


def _make_error(block: RawBlock, part_id: str | None, message: str) -> ImportErrorItem:
    """中文说明：构造统一 error，并附带原文预览帮助定位格式问题。"""

    preview = clean_markdown_text(block.raw_text[:240])
    return ImportErrorItem(index=block.index, part_id=part_id, message=message, raw_text_preview=preview)
