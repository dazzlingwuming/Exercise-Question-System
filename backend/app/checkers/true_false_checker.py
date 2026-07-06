"""中文说明：判断题答案归一化和判分。"""

from __future__ import annotations

from typing import Any

from app.checkers.base import BaseAnswerChecker


class TrueFalseChecker(BaseAnswerChecker):
    """中文说明：判断题判分器，将中英文真假表达统一为布尔值。"""

    TRUE_VALUES = {"正确", "对", "TRUE", "T", "是", "YES", "Y", "1"}
    FALSE_VALUES = {"错误", "错", "FALSE", "F", "否", "NO", "N", "0"}

    def normalize_standard_answer(self, raw_answer: Any) -> bool | None:
        return self._normalize(raw_answer)

    def normalize_user_answer(self, raw_answer: Any) -> bool | None:
        return self._normalize(raw_answer)

    def _normalize(self, raw_answer: Any) -> bool | None:
        value = str(raw_answer).strip().upper()
        if value in self.TRUE_VALUES:
            return True
        if value in self.FALSE_VALUES:
            return False
        return None
