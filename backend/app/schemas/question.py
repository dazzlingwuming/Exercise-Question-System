"""中文说明：定义题目 API 的输入输出结构。"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict


class QuestionType(StrEnum):
    """中文说明：系统内部使用的题型枚举，保留扩展型主观题。"""

    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    fill_blank = "fill_blank"
    short_answer = "short_answer"
    essay = "essay"
    flow_order = "flow_order"
    concept_analysis = "concept_analysis"
    scenario_analysis = "scenario_analysis"
    interview = "interview"
    debug_analysis = "debug_analysis"
    code_reading = "code_reading"
    system_design = "system_design"
    project_follow_up = "project_follow_up"
    mock_interview = "mock_interview"
    unknown = "unknown"


class OptionSchema(BaseModel):
    """中文说明：选择题选项结构。"""

    key: str
    text: str


class QuestionRead(BaseModel):
    """中文说明：前端展示题目详情时使用的完整结构。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    part_id: str | None = None
    title: str | None = None
    type: str
    type_label: str
    difficulty: str | None = None
    tags: list[str] = []
    directions: list[str] = []
    import_order: int | None = None
    stem: str
    material: str | None = None
    options: list[OptionSchema] = []
    standard_answer: Any = None
    answer_text: str | None = None
    explanation: str | None = None
    exam_points: list[str] = []
    common_mistakes: str | None = None
    follow_up_question: str | None = None
    scoring_standard: str | None = None
    source_text: str
    parse_warnings: list[str] = []
    version: int = 1
    is_deleted: bool = False
    deleted_at: datetime | None = None
    delete_reason: str | None = None
    deleted_source: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class QuestionListResponse(BaseModel):
    """中文说明：题目分页列表响应。"""

    total: int
    page: int
    page_size: int
    items: list[QuestionRead]


class QuestionUpdate(BaseModel):
    """中文说明：题目编辑请求结构，所有字段均可选以支持局部更新。"""

    title: str | None = None
    type: str | None = None
    type_label: str | None = None
    difficulty: str | None = None
    tags: list[str] | None = None
    directions: list[str] | str | None = None
    import_order: int | None = None
    stem: str | None = None
    material: str | None = None
    options: list[OptionSchema] | None = None
    standard_answer: Any = None
    explanation: str | None = None
    exam_points: list[str] | None = None
    common_mistakes: str | None = None
    follow_up_question: str | None = None
    scoring_standard: str | None = None
    reason: str | None = None


class QuestionCreate(BaseModel):
    """中文说明：页面手动新增题目请求结构，id/part_id/import_order 由后端生成。"""

    type: str
    type_label: str | None = None
    difficulty: str | None = None
    tags: list[str] = []
    directions: list[str] = []
    stem: str
    material: str | None = None
    options: list[OptionSchema] = []
    standard_answer: Any = None
    explanation: str | None = None
    exam_points: list[str] = []
    common_mistakes: str | None = None
    follow_up_question: str | None = None
    scoring_standard: str | None = None
    reason: str | None = None


class QuestionRevisionSummary(BaseModel):
    """中文说明：修改历史列表使用的轻量结构。"""

    model_config = ConfigDict(from_attributes=True)

    id: str
    question_id: str
    version_before: int
    version_after: int
    changed_fields: list[str]
    reason: str | None = None
    source: str
    created_at: datetime | None = None


class QuestionRevisionRead(QuestionRevisionSummary):
    """中文说明：修改历史详情结构，包含修改前后完整题目数据。"""

    before_data: dict[str, Any]
    after_data: dict[str, Any]


class RevisionRestoreRequest(BaseModel):
    """中文说明：恢复历史版本请求，默认恢复 revision 的修改前数据。"""

    restore_target: str = "before"
    reason: str | None = None


class QuestionDeleteRequest(BaseModel):
    """中文说明：软删除或恢复题目时填写原因。"""

    reason: str | None = None


class QuestionDeleteStatus(BaseModel):
    """中文说明：删除/恢复后返回题目删除状态。"""

    question_id: str
    is_deleted: bool
    deleted_at: datetime | None = None
    delete_reason: str | None = None
    deleted_source: str | None = None


class FilterOptionsResponse(BaseModel):
    """中文说明：前端练习和题库筛选所需的去重选项。"""

    types: list[str]
    difficulties: list[str]
    tags: list[str]
    exam_points: list[str]
    directions: list[str]


class QuestionPageResponse(BaseModel):
    """中文说明：练习候选题分页响应。"""

    items: list[QuestionRead]
    total: int
    page: int
    page_size: int
    has_next: bool
