"""中文说明：AI 讲题助手 API 的输入输出结构。"""

from datetime import datetime

from pydantic import BaseModel


class AiConfig(BaseModel):
    provider: str = "deepseek"
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None
    stream: bool = False


class AiTestRequest(AiConfig):
    pass


class AiTestResponse(BaseModel):
    ok: bool
    message: str


class AiMessageRead(BaseModel):
    role: str
    stage: str
    content: str
    created_at: datetime | None = None


class AiAllowedActions(BaseModel):
    hint: bool
    explanation: bool
    engineering_example: bool
    interview_followup: bool


class AiThreadResponse(BaseModel):
    thread_id: str
    question_id: str
    attempt_id: str | None = None
    submitted: bool
    current_stage: str
    has_hint: bool
    has_explanation: bool
    has_engineering_example: bool
    has_interview_followup: bool
    allowed_actions: AiAllowedActions
    messages: list[AiMessageRead]
    has_previous_ai_history: bool = False
    previous_summary: str | None = None


class AiActionRequest(AiConfig):
    question_id: str
    attempt_id: str | None = None
    action: str


class AiUserMessageRequest(AiConfig):
    question_id: str
    attempt_id: str | None = None
    content: str


class AiSummaryRequest(AiConfig):
    question_id: str
    attempt_id: str


class AiActionResponse(BaseModel):
    ok: bool
    error_code: str | None = None
    message: str | None = None
    thread: AiThreadResponse | None = None


class AiGradingRequest(AiConfig):
    """中文说明：AI 主观题评分请求，题目和答案上下文由后端读取。"""

    question_id: str
    attempt_id: str


class AiDimensionScore(BaseModel):
    name: str
    score: float
    max_score: float
    comment: str = ""


class AiGradingCard(BaseModel):
    score: float
    max_score: float = 10
    level: str
    summary: str
    dimension_scores: list[AiDimensionScore] = []
    matched_points: list[str] = []
    missing_points: list[str] = []
    wrong_or_unclear_points: list[str] = []
    improvement_suggestion: str = ""
    better_answer: str = ""


class AiGradingResultRead(BaseModel):
    grading_id: int | None = None
    question_id: str | None = None
    attempt_id: str | None = None
    provider: str | None = None
    model: str | None = None
    rubric_version: str | None = None
    score: float | None = None
    max_score: float | None = None
    level: str | None = None
    summary: str | None = None
    result: AiGradingCard | None = None
    created_at: datetime | None = None
    messages: list[AiMessageRead] = []


class AiGradingHistoryResponse(BaseModel):
    items: list[AiGradingResultRead]


class AiGradingChatRequest(AiConfig):
    """中文说明：围绕某一次 AI 评分卡继续追问。"""

    grading_id: int
    content: str
