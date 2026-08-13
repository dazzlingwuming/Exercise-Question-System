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

    cleaned = re.sub(r"<[^>]+>", "", content).strip()
    if not submitted and DIRECT_ANSWER_PATTERN.search(cleaned):
        return guardrail_reply()
    if DISCLAIMER.strip() not in cleaned:
        cleaned += DISCLAIMER
    return cleaned


def guardrail_reply() -> str:
    return "你还没有提交答案。我不能直接给出标准答案，但可以帮你从核心概念、适用场景和容易混淆点来分析。" + DISCLAIMER
