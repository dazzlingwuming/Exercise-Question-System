"""中文说明：主观题自评模式判分器。"""

from __future__ import annotations

from typing import Any

from app.checkers.base import BaseAnswerChecker, CheckResult


class SubjectiveChecker(BaseAnswerChecker):
    """中文说明：主观题第一版不自动判分，提交后交给用户自评。"""

    def normalize_standard_answer(self, raw_answer: Any) -> str:
        return str(raw_answer).strip()

    def normalize_user_answer(self, raw_answer: Any) -> str:
        return str(raw_answer).strip()

    def check(self, standard_answer: Any, user_answer: Any) -> CheckResult:
        return CheckResult(
            is_correct=None,
            normalized_user_answer=self.normalize_user_answer(user_answer),
            correct_answer_normalized=self.normalize_standard_answer(standard_answer),
            score=None,
            max_score=1.0,
            requires_self_review=True,
        )
