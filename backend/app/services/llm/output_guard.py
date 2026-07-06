"""中文说明：AI 输出安全处理，避免 raw HTML 和提交前泄露答案。"""

import re


DISCLAIMER = "\n\n> AI 讲解仅供辅助，最终以题库标准答案为准。"


def sanitize_output(content: str, *, submitted: bool) -> str:
    """中文说明：移除明显 HTML 标签，并追加统一免责声明。"""

    cleaned = re.sub(r"<[^>]+>", "", content).strip()
    if not submitted:
        cleaned = re.sub(r"正确答案是[:：]?.*", "我不能在提交前直接给出答案，但可以继续帮你分析思路。", cleaned)
    if DISCLAIMER.strip() not in cleaned:
        cleaned += DISCLAIMER
    return cleaned


def guardrail_reply() -> str:
    return "你还没有提交答案。我不能直接给出标准答案，但可以帮你从核心概念、适用场景和容易混淆点来分析。" + DISCLAIMER
