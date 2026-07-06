"""中文说明：根据题型选择对应判分器，避免业务层出现巨大 if/else。"""

from __future__ import annotations

from typing import Any

from app.checkers.base import CheckResult
from app.checkers.choice_checker import MultipleChoiceChecker, SingleChoiceChecker
from app.checkers.fill_blank_checker import FillBlankChecker
from app.checkers.subjective_checker import SubjectiveChecker
from app.checkers.true_false_checker import TrueFalseChecker


CHECKERS = {
    "single_choice": SingleChoiceChecker(),
    "multiple_choice": MultipleChoiceChecker(),
    "true_false": TrueFalseChecker(),
    "fill_blank": FillBlankChecker(),
}


def check_answer(question_type: str, standard_answer: Any, user_answer: Any) -> CheckResult:
    """中文说明：统一判分入口，未注册题型默认进入主观自评模式。"""

    checker = CHECKERS.get(question_type, SubjectiveChecker())
    return checker.check(standard_answer, user_answer)
