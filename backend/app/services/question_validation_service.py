"""中文说明：题目保存前的业务校验，避免保存无法判分或结构明显错误的数据。"""

from __future__ import annotations

from typing import Any

from app.checkers.choice_checker import MultipleChoiceChecker, SingleChoiceChecker
from app.checkers.true_false_checker import TrueFalseChecker

OBJECTIVE_TYPES = {"single_choice", "multiple_choice", "true_false", "fill_blank"}


class QuestionValidationError(ValueError):
    """中文说明：题目编辑校验失败时抛出的业务异常。"""


def validate_question_for_save(question_data: dict[str, Any]) -> None:
    """中文说明：保存题目前统一校验题干、选项、题型和标准答案是否匹配。"""

    if not str(question_data.get("stem") or "").strip():
        raise QuestionValidationError("题干不能为空")

    options = question_data.get("options") or []
    validate_options(options)
    validate_answer_matches_question_type(
        str(question_data.get("type") or ""),
        options,
        question_data.get("standard_answer"),
        question_data.get("scoring_standard"),
    )


def validate_options(options: list[dict[str, Any]]) -> None:
    """中文说明：校验选项 key 不重复、key 和文本不为空，避免选择题答案无法定位。"""

    seen: set[str] = set()
    for option in options:
        key = str(option.get("key") or "").strip().upper()
        text = str(option.get("text") or "").strip()
        if not key:
            raise QuestionValidationError("选项 key 不能为空")
        if not text:
            raise QuestionValidationError(f"选项 {key} 文本不能为空")
        if key in seen:
            raise QuestionValidationError(f"选项 key 重复：{key}")
        seen.add(key)


def validate_answer_matches_question_type(
    question_type: str,
    options: list[dict[str, Any]],
    standard_answer: Any,
    scoring_standard: str | None = None,
) -> None:
    """中文说明：按题型校验标准答案格式，确保后续判分器能稳定工作。"""

    if question_type in OBJECTIVE_TYPES and _is_empty_answer(standard_answer):
        raise QuestionValidationError("客观题标准答案不能为空")

    option_keys = {str(option.get("key") or "").strip().upper() for option in options}
    if question_type == "single_choice":
        normalized = SingleChoiceChecker().normalize_standard_answer(standard_answer)
        if not normalized or normalized not in option_keys:
            raise QuestionValidationError("单选题标准答案必须是一个已有选项")
    elif question_type == "multiple_choice":
        normalized_many = MultipleChoiceChecker().normalize_standard_answer(standard_answer)
        if not normalized_many or any(item not in option_keys for item in normalized_many):
            raise QuestionValidationError("多选题标准答案必须全部属于已有选项")
    elif question_type == "true_false":
        if TrueFalseChecker().normalize_standard_answer(standard_answer) is None:
            raise QuestionValidationError("判断题标准答案必须是正确/错误等合法值")
    elif question_type == "fill_blank":
        if _is_empty_answer(standard_answer):
            raise QuestionValidationError("填空题标准答案不能为空")
    elif _is_empty_answer(standard_answer) and not str(scoring_standard or "").strip():
        raise QuestionValidationError("主观题至少需要参考答案或评分标准")


def _is_empty_answer(value: Any) -> bool:
    """中文说明：统一判断标准答案是否为空，兼容字符串、数组和 None。"""

    if value is None:
        return True
    if isinstance(value, list):
        return len(value) == 0
    return not str(value).strip()
