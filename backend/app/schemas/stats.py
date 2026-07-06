"""中文说明：定义统计页 API 返回结构。"""

from typing import Any

from pydantic import BaseModel


class StatsSummary(BaseModel):
    """中文说明：首页和统计页使用的基础练习统计。"""

    total_questions: int
    answered_count: int
    accuracy: float | None
    wrong_count: int
    type_distribution: dict[str, int]
    difficulty_distribution: dict[str, int]
    recent_attempts: list[Any]
    frequent_error_points: list[dict[str, Any]]
