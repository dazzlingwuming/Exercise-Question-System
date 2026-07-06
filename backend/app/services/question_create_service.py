"""中文说明：页面手动新增题目的服务。"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.question import Question
from app.services.question_revision_service import _build_revision, question_to_snapshot
from app.schemas.question import QuestionCreate, QuestionType
from app.services.direction_service import normalize_directions
from app.services.question_validation_service import validate_question_for_save


TYPE_LABELS = {
    QuestionType.single_choice.value: "单选题",
    QuestionType.multiple_choice.value: "多选题",
    QuestionType.true_false.value: "判断题",
    QuestionType.fill_blank.value: "填空题",
    QuestionType.short_answer.value: "简答题",
    QuestionType.essay.value: "论述题",
    QuestionType.flow_order.value: "流程排序题",
    QuestionType.concept_analysis.value: "概念辨析题",
    QuestionType.scenario_analysis.value: "场景分析题",
    QuestionType.interview.value: "面试题",
    QuestionType.debug_analysis.value: "Debug / 日志分析题",
    QuestionType.code_reading.value: "代码阅读 / 伪代码设计题",
    QuestionType.system_design.value: "系统设计题",
    QuestionType.project_follow_up.value: "项目追问模拟",
    QuestionType.mock_interview.value: "模拟面试套卷",
}


def create_question(db: Session, payload: QuestionCreate) -> Question:
    """
    中文说明：
    手动新增一道题目。新增题目直接写入正式 questions 表，
    自动生成 id、part_id、import_order 和 source_text，
    并生成 manual_create 修改历史，保证题目生命周期可追溯。
    """

    if payload.type not in TYPE_LABELS:
        raise ValueError("不支持的题型")
    import_order = next_import_order(db)
    question_data = _payload_to_question_data(payload, import_order)
    validate_question_for_save(question_data)
    question = Question(**question_data)
    db.add(question)
    db.flush()
    after_data = question_to_snapshot(question)
    revision = _build_revision(
        question.id,
        {},
        after_data,
        ["created"],
        payload.reason,
        "manual_create",
    )
    revision.version_before = 0
    revision.version_after = 1
    db.add(revision)
    db.commit()
    db.refresh(question)
    return question


def next_import_order(db: Session) -> int:
    """中文说明：返回当前题库下一条导入顺序号。"""

    max_order = db.scalar(select(func.max(Question.import_order))) or 0
    return int(max_order) + 1


def build_manual_part_id(import_order: int) -> str:
    """中文说明：根据 import_order 生成手动新增题目的 part_id。"""

    return f"Manual-{import_order:06d}"


def build_manual_source_text(payload: QuestionCreate) -> str:
    """中文说明：为手动新增题目生成可读 source_text，便于历史和快照追溯。"""

    lines = [
        "manual_create",
        "",
        f"题型：{payload.type_label or TYPE_LABELS.get(payload.type, payload.type)}",
        f"难度：{payload.difficulty or ''}",
        "",
        f"题干：\n{payload.stem}",
        "",
        f"标准答案：\n{payload.standard_answer}",
    ]
    if payload.options:
        lines.extend(["", "选项："])
        lines.extend(f"{option.key}. {option.text}" for option in payload.options)
    if payload.explanation:
        lines.extend(["", f"详细解析：\n{payload.explanation}"])
    return "\n".join(lines)


def _payload_to_question_data(payload: QuestionCreate, import_order: int) -> dict[str, Any]:
    part_id = build_manual_part_id(import_order)
    type_label = payload.type_label or TYPE_LABELS[payload.type]
    options = [_normalize_option(option) for option in payload.options]
    return {
        "id": f"manual_{uuid4().hex}",
        "part_id": part_id,
        "title": part_id,
        "type": payload.type,
        "type_label": type_label,
        "difficulty": payload.difficulty,
        "tags": payload.tags or ["手动新增"],
        "directions": normalize_directions(payload.directions),
        "import_order": import_order,
        "stem": payload.stem,
        "material": payload.material,
        "options": options,
        "standard_answer": payload.standard_answer,
        "answer_text": str(payload.standard_answer),
        "explanation": payload.explanation,
        "exam_points": payload.exam_points or [],
        "common_mistakes": payload.common_mistakes,
        "follow_up_question": payload.follow_up_question,
        "scoring_standard": payload.scoring_standard,
        "source_text": build_manual_source_text(payload),
        "parse_warnings": [],
        "version": 1,
        "is_deleted": False,
        "deleted_at": None,
        "delete_reason": None,
        "deleted_source": None,
        "updated_at": datetime.now(),
    }


def _normalize_option(option: Any) -> dict[str, str]:
    if hasattr(option, "model_dump"):
        option = option.model_dump()
    return {"key": str(option.get("key") or "").strip().upper(), "text": str(option.get("text") or "").strip()}
