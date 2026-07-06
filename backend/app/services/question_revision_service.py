"""中文说明：封装题目编辑、版本递增、修改留痕和历史恢复。"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.schemas.question import QuestionUpdate
from app.services.direction_service import normalize_directions
from app.services.question_validation_service import validate_question_for_save

EDITABLE_FIELDS = {
    "title",
    "type",
    "type_label",
    "difficulty",
    "tags",
    "directions",
    "stem",
    "material",
    "options",
    "standard_answer",
    "explanation",
    "exam_points",
    "common_mistakes",
    "follow_up_question",
    "scoring_standard",
}


def question_to_snapshot(question: Question) -> dict[str, Any]:
    """中文说明：生成题目完整快照，供修改历史和答题记录追踪当时题目状态。"""

    return {
        "id": question.id,
        "part_id": question.part_id,
        "title": question.title,
        "type": question.type,
        "type_label": question.type_label,
        "difficulty": question.difficulty,
        "tags": question.tags or [],
        "directions": question.directions or [],
        "import_order": question.import_order,
        "stem": question.stem,
        "material": question.material,
        "options": question.options or [],
        "standard_answer": question.standard_answer,
        "answer_text": question.answer_text,
        "explanation": question.explanation,
        "exam_points": question.exam_points or [],
        "common_mistakes": question.common_mistakes,
        "follow_up_question": question.follow_up_question,
        "scoring_standard": question.scoring_standard,
        "source_text": question.source_text,
        "parse_warnings": question.parse_warnings or [],
        "version": question.version,
        "is_deleted": bool(question.is_deleted),
        "deleted_at": question.deleted_at.isoformat() if question.deleted_at else None,
        "delete_reason": question.delete_reason,
        "deleted_source": question.deleted_source,
    }


def update_question(db: Session, question: Question, payload: QuestionUpdate) -> Question:
    """中文说明：局部更新题目，校验通过后递增版本并写入 question_revisions。"""

    update_data = payload.model_dump(exclude_unset=True)
    reason = update_data.pop("reason", None)
    before_data = question_to_snapshot(question)
    next_data = before_data.copy()

    for field in EDITABLE_FIELDS:
        if field in update_data:
            value = update_data[field]
            if field == "options" and value is not None:
                value = [_normalize_option(option) for option in value]
            if field == "directions":
                value = normalize_directions(value)
            next_data[field] = value
    if "standard_answer" in update_data:
        next_data["answer_text"] = str(update_data["standard_answer"])

    validate_question_for_save(next_data)
    changed_fields = [field for field in EDITABLE_FIELDS if before_data.get(field) != next_data.get(field)]
    if not changed_fields:
        return question

    for field in EDITABLE_FIELDS | {"answer_text"}:
        if field in next_data:
            setattr(question, field, next_data[field])
    question.version = int(question.version or 1) + 1
    question.updated_at = datetime.now()
    after_data = question_to_snapshot(question)
    revision = _build_revision(question.id, before_data, after_data, changed_fields, reason, "manual_edit")
    db.add(revision)
    db.commit()
    db.refresh(question)
    return question


def list_revisions(db: Session, question_id: str) -> list[QuestionRevision]:
    """中文说明：按创建时间倒序返回某题的修改历史。"""

    return list(
        db.scalars(
            select(QuestionRevision)
            .where(QuestionRevision.question_id == question_id)
            .order_by(QuestionRevision.version_after.desc(), QuestionRevision.created_at.desc())
        ).all()
    )


def restore_revision(db: Session, question: Question, revision: QuestionRevision, restore_target: str, reason: str | None) -> Question:
    """中文说明：恢复到某条历史的 before/after 数据，恢复动作本身也会生成新 revision。"""

    if restore_target not in {"before", "after"}:
        raise ValueError("restore_target 只能是 before 或 after")
    before_data = question_to_snapshot(question)
    target_data = revision.before_data if restore_target == "before" else revision.after_data
    next_data = before_data.copy()
    for field in EDITABLE_FIELDS:
        if field in target_data:
            next_data[field] = target_data[field]
    if "standard_answer" in target_data:
        next_data["answer_text"] = str(target_data["standard_answer"])
    validate_question_for_save(next_data)
    changed_fields = [field for field in EDITABLE_FIELDS if before_data.get(field) != next_data.get(field)]
    if not changed_fields:
        return question
    for field in EDITABLE_FIELDS | {"answer_text"}:
        if field in next_data:
            setattr(question, field, next_data[field])
    question.version = int(question.version or 1) + 1
    question.updated_at = datetime.now()
    after_data = question_to_snapshot(question)
    db.add(_build_revision(question.id, before_data, after_data, changed_fields, reason, "restore"))
    db.commit()
    db.refresh(question)
    return question


def _build_revision(
    question_id: str,
    before_data: dict[str, Any],
    after_data: dict[str, Any],
    changed_fields: list[str],
    reason: str | None,
    source: str,
) -> QuestionRevision:
    """中文说明：构造修改历史记录，版本号永远随题目版本向前推进。"""

    return QuestionRevision(
        id=str(uuid4()),
        question_id=question_id,
        version_before=int(before_data.get("version") or 1),
        version_after=int(after_data.get("version") or 1),
        before_data=before_data,
        after_data=after_data,
        changed_fields=changed_fields,
        reason=reason,
        source=source,
    )


def _normalize_option(option: Any) -> dict[str, str]:
    """中文说明：将前端传入的选项对象归一化为数据库 JSON 结构。"""

    if hasattr(option, "model_dump"):
        option = option.model_dump()
    return {"key": str(option.get("key") or "").strip().upper(), "text": str(option.get("text") or "").strip()}
