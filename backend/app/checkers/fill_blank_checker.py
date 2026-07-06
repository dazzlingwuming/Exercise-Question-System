"""中文说明：填空题答案归一化和判分。"""

from __future__ import annotations

import re
from typing import Any

from app.checkers.base import BaseAnswerChecker, CheckResult
from app.parsers.field_parser import normalize_text_for_fill_blank


class FillBlankChecker(BaseAnswerChecker):
    """中文说明：填空题判分器，支持多个可接受答案但不做语义推断。"""

    def normalize_standard_answer(self, raw_answer: Any) -> list[str]:
        text = str(raw_answer)
        parts = re.split(r"\s*(?:/|或|或者|、|;|；)\s*", text)
        return [normalize_text_for_fill_blank(part) for part in parts if normalize_text_for_fill_blank(part)]

    def normalize_user_answer(self, raw_answer: Any) -> str:
        return normalize_text_for_fill_blank(str(raw_answer))

    def check(self, standard_answer: Any, user_answer: Any) -> CheckResult:
        normalized_standard = self.normalize_standard_answer(standard_answer)
        normalized_user = self.normalize_user_answer(user_answer)
        is_correct = normalized_user in normalized_standard
        return CheckResult(is_correct, normalized_user, normalized_standard, 1.0 if is_correct else 0.0, 1.0)
