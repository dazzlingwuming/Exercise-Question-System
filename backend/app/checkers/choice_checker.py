"""中文说明：选择题答案归一化和判分。"""

from __future__ import annotations

import re
from typing import Any

from app.checkers.base import BaseAnswerChecker, CheckResult


class SingleChoiceChecker(BaseAnswerChecker):
    """中文说明：单选题判分器，只接受一个选项字母并忽略大小写和空格。"""

    def normalize_standard_answer(self, raw_answer: Any) -> str:
        return self._normalize_one(raw_answer)

    def normalize_user_answer(self, raw_answer: Any) -> str:
        return self._normalize_one(raw_answer)

    def _normalize_one(self, raw_answer: Any) -> str:
        letters = re.findall(r"[A-Z]", str(raw_answer).upper())
        return letters[0] if letters else ""


class MultipleChoiceChecker(BaseAnswerChecker):
    """中文说明：多选题判分器，将多种输入格式归一化为有序列表后完全比较。"""

    def normalize_standard_answer(self, raw_answer: Any) -> list[str]:
        return self._normalize_many(raw_answer)

    def normalize_user_answer(self, raw_answer: Any) -> list[str]:
        return self._normalize_many(raw_answer)

    def check(self, standard_answer: Any, user_answer: Any) -> CheckResult:
        normalized_standard = self.normalize_standard_answer(standard_answer)
        normalized_user = self.normalize_user_answer(user_answer)
        is_correct = normalized_standard == normalized_user
        return CheckResult(is_correct, normalized_user, normalized_standard, 1.0 if is_correct else 0.0, 1.0)

    def _normalize_many(self, raw_answer: Any) -> list[str]:
        if isinstance(raw_answer, list):
            text = "".join(str(item) for item in raw_answer)
        else:
            text = str(raw_answer)
        letters = re.findall(r"[A-Z]", text.upper())
        return sorted(set(letters))
