"""中文说明：练习会话 API 的输入输出结构。"""

from typing import Any

from pydantic import BaseModel

from app.schemas.question import QuestionRead


class PracticeSessionCreate(BaseModel):
    """中文说明：创建稳定练习会话的请求参数。"""

    mode: str = "random"
    type: str | None = None
    difficulty: str | None = None
    exam_point: str | None = None
    direction: str | None = None
    order: str = "import_order"
    page_size: int = 20
    start_question_id: str | None = None
    allow_answered: bool = False


class PracticeSessionResponse(BaseModel):
    """中文说明：创建会话或切换分组后的响应。"""

    session_id: str
    mode: str
    total: int
    page_size: int
    current_index: int
    current_group_start: int
    current_group_end: int
    items: list[QuestionRead]
    has_next_group: bool
    has_previous_group: bool
    shortage_code: str | None = None
    requested_count: int | None = None
    available_count: int | None = None
    shortage_message: str | None = None


class PracticeSessionState(BaseModel):
    """中文说明：恢复会话时返回当前题和当前组。"""

    session_id: str
    mode: str
    total: int
    page_size: int
    current_index: int
    current_question: QuestionRead | None
    current_group_start: int
    current_group_end: int
    current_group: list[QuestionRead]
    has_next: bool
    has_previous: bool
    has_next_group: bool
    has_previous_group: bool
    filters: dict[str, Any]
    order: str


class PracticeGroupResponse(BaseModel):
    """中文说明：读取指定 offset/limit 分组的响应。"""

    items: list[QuestionRead]
    offset: int
    limit: int
    total: int
    current_index: int
    has_next_group: bool
    has_previous_group: bool


class PracticeMoveResponse(BaseModel):
    """中文说明：上一题、下一题移动游标后的响应。"""

    status: str
    current_index: int | None = None
    question: QuestionRead | None = None
    has_next: bool = False
    has_previous: bool = False
    has_next_group: bool = False
    next_group_offset: int | None = None
    message: str | None = None
