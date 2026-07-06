"""中文说明：提供字段名、选项、答案等 Markdown 局部内容解析工具。"""

from __future__ import annotations

import re
import unicodedata


FIELD_ALIASES = {
    "题目": "stem",
    "题目背景": "stem",
    "套卷主题": "stem",
    "选项": "options",
    "选项/材料": "options",
    "材料": "material",
    "问题现象": "material",
    "日志/线索": "material",
    "排查路径": "material",
    "需求澄清": "material",
    "核心约束": "material",
    "假设的项目描述": "material",
    "面试官问题": "stem",
    "问题背后的考察点": "exam_points",
    "标准答案": "standard_answer",
    "答案": "standard_answer",
    "参考答案": "standard_answer",
    "最优答案": "standard_answer",
    "答案要点": "standard_answer",
    "参考答案要点": "standard_answer",
    "架构设计": "standard_answer",
    "数据流": "standard_answer",
    "模块职责": "standard_answer",
    "关键技术取舍": "standard_answer",
    "安全与权限": "standard_answer",
    "评估指标": "standard_answer",
    "失败处理": "standard_answer",
    "成本与延迟优化": "standard_answer",
    "简短回答版本": "standard_answer",
    "深入回答版本": "standard_answer",
    "优秀回答": "standard_answer",
    "高质量回答": "standard_answer",
    "回答策略": "standard_answer",
    "详细解析": "explanation",
    "解析": "explanation",
    "工程落地注意点": "explanation",
    "考察点": "exam_points",
    "常见错误": "common_mistakes",
    "常见误判": "common_mistakes",
    "常见错误方案": "common_mistakes",
    "低质量回答": "common_mistakes",
    "面试延伸追问": "follow_up_question",
    "面试官追问链": "follow_up_question",
    "进一步追问": "follow_up_question",
    "评分标准": "scoring_standard",
    "优秀点": "scoring_standard",
}


def clean_markdown_text(value: str) -> str:
    """中文说明：清理 Markdown 加粗和多余空白，保留题干中的语义文本。"""

    text = value.replace("\u3000", " ")
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text.strip()


def parse_field_line(line: str) -> tuple[str, str] | None:
    """中文说明：识别“字段名：内容”行，兼容加粗字段名和中英文冒号。"""

    stripped = line.strip()
    match = re.match(r"^(?:[-*]\s*)?(?:\*\*)?([^：:*]+?)(?:\*\*)?\s*[：:]\s*(.*)$", stripped)
    if not match:
        return None
    raw_label = clean_markdown_text(match.group(1)).strip()
    label = FIELD_ALIASES.get(raw_label)
    if not label:
        return None
    return label, clean_markdown_text(match.group(2))


def parse_options(raw: str) -> list[dict[str, str]]:
    """中文说明：将选项文本解析成 A/B/C/D 结构，兼容行内和列表两种写法。"""

    text = clean_markdown_text(raw)
    if not text:
        return []
    normalized = re.sub(r"\s+", " ", text.replace("\n", " ")).strip()
    matches = list(re.finditer(r"(?:^|\s|[-*]\s*)([A-Z])[\.\、]\s*", normalized))
    options: list[dict[str, str]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(normalized)
        option_text = normalized[start:end].strip(" ;；")
        if option_text:
            options.append({"key": match.group(1), "text": option_text})
    return options


def split_exam_points(raw: str | None) -> list[str]:
    """中文说明：把考察点拆成列表，便于统计高频错误知识点。"""

    if not raw:
        return []
    text = clean_markdown_text(raw).rstrip("。.")
    parts = re.split(r"[、,，;/；\n]+", text)
    return [part.strip() for part in parts if part.strip()]


def normalize_text_for_fill_blank(raw: str) -> str:
    """中文说明：填空题比较前的文本归一化，减少大小写和符号差异造成的误判。"""

    value = unicodedata.normalize("NFKC", str(raw)).strip().lower()
    value = re.sub(r"[，。；：、,.;:\s]+", "", value)
    return value
