"""中文说明：定义判分器统一接口和判分结果。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class CheckResult:
    """中文说明：封装一次判分的标准输出，供服务层写入 Attempt。"""

    is_correct: bool | None
    normalized_user_answer: Any
    correct_answer_normalized: Any
    score: float | None
    max_score: float | None
    requires_self_review: bool = False


class BaseAnswerChecker:
    """中文说明：所有题型判分器的基类，约束归一化和 check 接口。"""

    def normalize_standard_answer(self, raw_answer: Any) -> Any:
        """中文说明：将标准答案归一化成稳定可比较的结构。"""

        return raw_answer

    def normalize_user_answer(self, raw_answer: Any) -> Any:
        """中文说明：将用户答案归一化成稳定可比较的结构。"""

        return raw_answer

    def check(self, standard_answer: Any, user_answer: Any) -> CheckResult:
        """中文说明：默认按归一化值完全相等判分。"""

        normalized_standard = self.normalize_standard_answer(standard_answer)
        normalized_user = self.normalize_user_answer(user_answer)
        is_correct = normalized_standard == normalized_user
        return CheckResult(is_correct, normalized_user, normalized_standard, 1.0 if is_correct else 0.0, 1.0)
