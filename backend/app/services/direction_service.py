"""中文说明：题目方向 directions 的归一化工具。"""

from __future__ import annotations

import re


def normalize_directions(raw: list[str] | str | None) -> list[str]:
    """中文说明：归一化方向列表，支持逗号、顿号、斜杠分隔，去空去重且保留顺序。"""

    if raw is None:
        return []
    if isinstance(raw, str):
        parts = re.split(r"[、,，/;；\n]+", raw)
    else:
        parts = raw
    result: list[str] = []
    seen: set[str] = set()
    for item in parts:
        value = str(item).strip()
        if value and value not in seen:
            result.append(value)
            seen.add(value)
    return result
