"""中文说明：定义题库导入预览和确认导入的 API 结构。"""

from typing import Any

from pydantic import BaseModel

from app.schemas.question import QuestionRead


class ImportWarningItem(BaseModel):
    """中文说明：非致命解析问题，题目仍可导入但需要用户知晓。"""

    question_id: str | None = None
    part_id: str | None = None
    message: str


class ImportErrorItem(BaseModel):
    """中文说明：致命解析问题，该题不会被写入数据库。"""

    index: int
    part_id: str | None = None
    message: str
    raw_text_preview: str


class ImportPreviewRequest(BaseModel):
    """中文说明：导入预览请求，text 为空时读取根目录默认题库。"""

    text: str | None = None


class ImportPreviewResponse(BaseModel):
    """中文说明：导入预览响应，包含题目、统计、警告和错误。"""

    source_name: str
    success_count: int
    type_distribution: dict[str, int]
    difficulty_distribution: dict[str, int]
    questions: list[QuestionRead]
    warnings: list[ImportWarningItem]
    errors: list[ImportErrorItem]


class ImportCommitRequest(BaseModel):
    """中文说明：确认导入请求，默认重新读取根目录题库并导入。"""

    text: str | None = None


class ImportCommitResponse(BaseModel):
    """中文说明：确认导入结果。"""

    imported_count: int
    skipped_count: int
    warning_count: int
    error_count: int
    batch_id: str
    extra: dict[str, Any] = {}
