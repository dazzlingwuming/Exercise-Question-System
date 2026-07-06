"""中文说明：定义答题提交、答题记录和自评相关结构。"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SubmitAnswerRequest(BaseModel):
    """中文说明：提交答案请求，客观题可传字符串或数组，主观题通常传文本。"""

    answer: Any
    practice_session_id: str | None = None


class SubmitAnswerResponse(BaseModel):
    """中文说明：提交答案后的判分结果和解析信息。"""

    attempt_id: str
    is_correct: bool | None
    requires_self_review: bool
    normalized_user_answer: Any = None
    correct_answer_normalized: Any = None
    standard_answer: Any = None
    explanation: str | None = None
    exam_points: list[str] = []
    common_mistakes: str | None = None
    follow_up_question: str | None = None
    scoring_standard: str | None = None


class AttemptRead(BaseModel):
    """中文说明：答题记录展示结构。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    question_id: str
    practice_session_id: str | None = None
    user_answer_raw: str
    user_answer_normalized: Any = None
    correct_answer_normalized: Any = None
    is_correct: bool | None = None
    score: float | None = None
    max_score: float | None = None
    review_status: str | None = None
    question_version: int | None = None
    question_snapshot: Any = None
    created_at: datetime | None = None


class QuestionStateRead(BaseModel):
    """中文说明：答题页安全使用的题目状态摘要，不包含历史答案、正确答案或解析。"""

    question_id: str
    status: str = "new"
    attempt_count: int = 0
    correct_count: int = 0
    wrong_count: int = 0
    last_result: str | None = None
    last_attempt_at: datetime | None = None
    next_review_at: datetime | None = None
    mastery_level: int = 0


class QuestionHistoryResponse(BaseModel):
    """中文说明：历史复盘接口使用，允许返回完整历史作答。"""

    question_id: str
    attempts: list[AttemptRead]


class AttemptWithQuestion(BaseModel):
    """中文说明：错题页使用的答题记录和题目摘要组合结构。"""

    attempt: AttemptRead
    question: Any


class WrongQuestionItem(BaseModel):
    """中文说明：错题分页列表中的聚合项。"""

    attempt: AttemptRead
    question: Any
    wrong_count: int
    last_wrong_at: datetime | None = None
    last_wrong_answer: str


class WrongQuestionPageResponse(BaseModel):
    """中文说明：错题分页响应结构。"""

    items: list[WrongQuestionItem]
    total: int
    page: int
    page_size: int
    has_next: bool


class SelfReviewRequest(BaseModel):
    """中文说明：主观题自评请求，status 只能是 correct、partial、wrong。"""

    status: str
