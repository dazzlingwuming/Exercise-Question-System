"""中文说明：AI 输出安全处理，避免 raw HTML 和提交前泄露答案。"""

import re


DISCLAIMER = "\n\n> AI 讲解仅供辅助，最终以题库标准答案为准。"
DIRECT_ANSWER_PATTERN = re.compile(
    r"(?:正确|标准)\s*答案\s*(?:是|为|[:：])"
    r"|(?:答案|应当|应该)\s*(?:是|为|选(?:择)?|[:：])\s*(?:[A-Z]|正确|错误)"
    r"|(?:请选择|选择|应选)\s*(?:选项)?\s*[A-Z](?:\b|$)",
    re.IGNORECASE,
)


def sanitize_output(content: str, *, submitted: bool) -> str:
    """中文说明：移除明显 HTML 标签，并追加统一免责声明。"""

    cleaned = normalize_markdown_output(normalize_math_delimiters(re.sub(r"<[^>]+>", "", content))).strip()
    if not submitted and DIRECT_ANSWER_PATTERN.search(cleaned):
        return guardrail_reply()
    if DISCLAIMER.strip() not in cleaned:
        cleaned += DISCLAIMER
    return cleaned


def normalize_math_delimiters(content: str) -> str:
    """将模型常见的 LaTeX 定界符误用修正为 Markdown math 可解析形式。

    这是保守的传输层修正：不猜测裸露的数学表达式，只处理明确的成对
    `\\(...\\)`/`\\[...\\]`，以及把中文误包在 `$$` 中的情况。
    """

    normalized = re.sub(
        r"\\\[([\s\S]*?)\\\]",
        lambda match: f"\n$$\n{match.group(1).strip()}\n$$\n",
        content,
    )
    normalized = re.sub(
        r"\\\(([\s\S]*?)\\\)",
        lambda match: f"${match.group(1).strip()}$",
        normalized,
    )
    # A block that contains Chinese prose or nested `$...$` is not a valid
    # block formula. Remove only the outer markers so inner inline formulas
    # can still be parsed independently.
    normalized = re.sub(
        r"\$\$([\s\S]*?)\$\$",
        lambda match: match.group(1).strip() if (re.search(r"[\u3400-\u9fff]", match.group(1)) or "$" in match.group(1)) else f"\n$$\n{match.group(1).strip()}\n$$\n",
        normalized,
    )
    # A stray block marker can consume all subsequent prose. Drop block
    # markers only when they are unbalanced; valid `$$...$$` stays untouched.
    if len(re.findall(r"\$\$", normalized)) % 2:
        normalized = normalized.replace("$$", "")
    return normalized


def normalize_markdown_output(content: str) -> str:
    """修复旧 AI 消息中确定无歧义的 Markdown 结构错误。"""

    lines: list[str] = []
    for line in content.splitlines():
        line = re.sub(r"^(#{1,6})(?=\S)", r"\1 ", line)
        stripped = line.strip()
        if stripped.startswith("P(") and "=" in stripped and "\\prod" in stripped and not re.search(r"[\u3400-\u9fff]", stripped):
            line = line.replace(stripped, f"${stripped}$")
        lines.append(line)
    return "\n".join(lines)


def guardrail_reply() -> str:
    return "你还没有提交答案。我不能直接给出标准答案，但可以帮你从核心概念、适用场景和容易混淆点来分析。" + DISCLAIMER
