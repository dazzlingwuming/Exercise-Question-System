"""中文说明：题目软删除、恢复和回收站查询服务。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.services.question_revision_service import _build_revision, question_to_snapshot
from app.services.question_service import active_collection_or_error, list_questions
from app.services.collection_service import ensure_system_collections


def soft_delete_question(db: Session, question: Question, reason: str | None) -> Question:
    """
    中文说明：
    对题目执行软删除。软删除只修改题目的删除状态，
    不会物理删除题目、答题记录或修改历史，避免历史数据断链。
    删除后的题目默认不再进入题库列表、练习、错题和统计。
    """

    if question.is_deleted:
        raise ValueError("题目已删除，不能重复删除")
    mark_question_deleted(db, question, reason, source="manual_delete")
    db.commit()
    db.refresh(question)
    return question


def restore_deleted_question(
    db: Session,
    question: Question,
    reason: str | None,
    target_collection_id: str | None = None,
) -> Question:
    """中文说明：恢复已软删除题目，并用 revision 留痕。"""

    if not question.is_deleted:
        raise ValueError("题目未删除，无需恢复")
    ensure_system_collections(db)
    restore_question_in_transaction(db, question, reason, target_collection_id=target_collection_id)
    db.commit()
    db.refresh(question)
    return question


def mark_question_deleted(
    db: Session,
    question: Question,
    reason: str | None,
    *,
    source: str,
    collection_deletion_id: str | None = None,
) -> Question:
    """在当前事务中软删题目，不提交，供集合子树删除复用。"""

    if question.is_deleted:
        return question
    before_data = question_to_snapshot(question)
    question.is_deleted = True
    question.deleted_at = datetime.now()
    question.delete_reason = reason
    question.deleted_source = source
    question.collection_deletion_id = collection_deletion_id
    question.updated_at = datetime.now()
    after_data = question_to_snapshot(question)
    db.add(
        _delete_revision(
            question.id,
            before_data,
            after_data,
            ["is_deleted", "deleted_at", "delete_reason", "collection_deletion_id"],
            reason,
            source,
        )
    )
    return question


def restore_question_in_transaction(
    db: Session,
    question: Question,
    reason: str | None,
    *,
    target_collection_id: str | None = None,
    source: str = "restore_deleted_question",
) -> Question:
    """在当前事务中恢复题目；原集合失效时移至目标或未归类，不提交。"""

    if not question.is_deleted:
        raise ValueError("题目未删除，无需恢复")
    if target_collection_id is not None:
        target = active_collection_or_error(db, target_collection_id)
    else:
        try:
            target = active_collection_or_error(db, question.collection_id)
        except ValueError:
            target = active_collection_or_error(db, None, default_to_unfiled=True)
    before_data = question_to_snapshot(question)
    question.collection_id = target.id
    question.is_deleted = False
    question.deleted_at = None
    question.delete_reason = None
    question.deleted_source = None
    question.collection_deletion_id = None
    question.updated_at = datetime.now()
    after_data = question_to_snapshot(question)
    db.add(
        _delete_revision(
            question.id,
            before_data,
            after_data,
            ["is_deleted", "deleted_at", "delete_reason", "collection_id", "collection_deletion_id"],
            reason,
            source,
        )
    )
    return question


def list_deleted_questions(db: Session, page: int, page_size: int, **filters: object) -> tuple[int, list[Question]]:
    """中文说明：分页查询回收站题目。"""

    return list_questions(db, page, page_size, only_deleted=True, **filters)


def ensure_question_not_deleted_for_practice(question: Question) -> None:
    """中文说明：提交答案或练习使用题目前，明确阻止已删除题目继续参与。"""

    if question.is_deleted:
        raise ValueError("题目已删除，不能继续练习或提交答案")


def _delete_revision(
    question_id: str,
    before_data: dict,
    after_data: dict,
    changed_fields: list[str],
    reason: str | None,
    source: str,
) -> QuestionRevision:
    """中文说明：复用 question_revisions 表记录删除和恢复动作。"""

    return _build_revision(question_id, before_data, after_data, changed_fields, reason, source)
