"""中文说明：定义题库导入预览和确认导入的 API 结构。"""

from typing import Any

from pydantic import BaseModel

from app.schemas.question import QuestionRead


class ImportWarningItem(BaseModel):
    """中文说明：非致命解析问题，题目仍可导入但需要用户知晓。"""

    question_id: str | None = None
    part_id: str | None = None
    field: str | None = None
    message: str


class ImportErrorItem(BaseModel):
    """中文说明：致命解析问题，该题不会被写入数据库。"""

    index: int
    part_id: str | None = None
    question_id: str | None = None
    field: str | None = None
    message: str
    raw_text_preview: str


class ImportConflictItem(BaseModel):
    """中文说明：预览时发现的数据库既有题目冲突。"""

    question_id: str
    part_id: str | None = None
    status: str
    message: str


class ImportPreviewRequest(BaseModel):
    """中文说明：导入预览请求，text 为空时读取根目录默认题库。"""

    text: str | None = None
    batch_name: str | None = None
    # 旧客户端兼容字段；服务会映射为 batch_name。
    source_name: str | None = None


class ImportPreviewResponse(BaseModel):
    """中文说明：导入预览响应，包含题目、统计、警告和错误。"""

    batch_name: str
    format_version: str = "legacy"
    is_legacy: bool = True
    success_count: int
    blocking_error_count: int = 0
    type_distribution: dict[str, int]
    difficulty_distribution: dict[str, int]
    questions: list[QuestionRead]
    warnings: list[ImportWarningItem]
    errors: list[ImportErrorItem]
    database_conflicts: list[ImportConflictItem] = []


class ImportCommitRequest(BaseModel):
    """中文说明：确认导入请求，默认重新读取根目录题库并导入。"""

    text: str | None = None
    batch_name: str | None = None
    collection_id: str | None = None
    # 旧客户端兼容字段；缺省 collection_id 时导入至未归类。
    source_name: str | None = None


class ImportCommitResponse(BaseModel):
    """中文说明：确认导入结果。"""

    imported_count: int
    skipped_count: int
    warning_count: int
    error_count: int
    batch_id: str
    extra: dict[str, Any] = {}
