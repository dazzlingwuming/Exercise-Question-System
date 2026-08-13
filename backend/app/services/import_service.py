"""中文说明：负责题库解析预览和正式写入 SQLite。"""

from __future__ import annotations

from collections import Counter
import json
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.ai_question_generation import AiQuestionCandidate, AiQuestionGeneration
from app.models.ai_tutor import AiTutorMessage, AiTutorThread
from app.models.attempt import Attempt
from app.models.import_batch import ImportBatch
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.question_source import QuestionSource
from app.models.question_revision import QuestionRevision
from app.models.user_question_state import UserQuestionState
from app.parsers.markdown_parser import parse_markdown_question_bank
from app.schemas.import_schema import ImportCommitResponse, ImportConflictItem, ImportPreviewResponse, ImportWarningItem
from app.schemas.question import QuestionRead


class ImportValidationError(ValueError):
    """中文说明：导入前预校验失败，调用方应提示用户修正而不是写入部分题目。"""


def load_default_question_bank() -> str:
    """中文说明：读取根目录题库文件，导入预览默认使用它作为数据源。"""

    return settings.question_bank_path.read_text(encoding="utf-8")


def preview_import(
    text: str | None = None,
    source_name: str | None = None,
    db: Session | None = None,
) -> ImportPreviewResponse:
    """中文说明：只解析不入库，用于前端确认导入前检查 warning/error。"""

    raw_text, resolved_source_name = _resolve_source(text, source_name)
    result = parse_markdown_question_bank(raw_text)
    type_distribution = Counter(question.type_label for question in result.questions)
    difficulty_distribution = Counter(question.difficulty or "未标注" for question in result.questions)
    warnings = _warnings_for_preview(result)
    conflicts = _find_database_conflicts(db, result.questions) if db is not None else []
    return ImportPreviewResponse(
        source_name=resolved_source_name,
        format_version=result.format_version,
        is_legacy=result.is_legacy,
        success_count=len(result.questions),
        blocking_error_count=len(result.errors) + sum(item.status == "different" for item in conflicts),
        type_distribution=dict(type_distribution),
        difficulty_distribution=dict(difficulty_distribution),
        questions=result.questions[:100],
        warnings=warnings,
        errors=result.errors,
        database_conflicts=conflicts,
    )


def commit_import(db: Session, text: str | None = None, source_name: str | None = None) -> ImportCommitResponse:
    """中文说明：追加导入经完整预校验的题目；相同题目跳过，冲突题目不会覆盖。"""

    raw_text, resolved_source_name = _resolve_source(text, source_name)
    result = parse_markdown_question_bank(raw_text)
    conflicts = _find_database_conflicts(db, result.questions)
    _ensure_committable(result.errors, conflicts)

    source = _get_or_create_source(db, resolved_source_name)
    conflict_by_question_id = {item.question_id: item for item in conflicts}
    imported_count = 0
    skipped_count = 0
    import_order = int(db.scalar(select(func.max(Question.import_order))) or 0)
    for item in result.questions:
        if item.id in conflict_by_question_id:
            skipped_count += 1
            continue
        import_order += 1
        db.add(_question_schema_to_model(item, import_order, source.id))
        imported_count += 1

    warnings = _warnings_for_preview(result)
    batch = ImportBatch(
        id=str(uuid4()),
        source_name=resolved_source_name,
        source_id=source.id,
        format_version=result.format_version,
        imported_count=imported_count,
        skipped_count=skipped_count,
        warning_count=len(warnings),
        error_count=len(result.errors),
    )
    db.add(batch)
    db.commit()
    return ImportCommitResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        warning_count=len(warnings),
        error_count=len(result.errors),
        batch_id=batch.id,
        extra={"format_version": result.format_version, "skipped_existing": skipped_count},
    )


def reset_and_commit_import(db: Session, text: str | None = None, source_name: str | None = None) -> ImportCommitResponse:
    """中文说明：物理清空旧题库及其依赖数据，然后重新导入当前题库。"""

    raw_text, resolved_source_name = _resolve_source(text, source_name)
    result = parse_markdown_question_bank(raw_text)
    _ensure_committable(result.errors, [])
    _hard_delete_all_question_data(db)
    source = _get_or_create_source(db, resolved_source_name)
    imported_count = 0
    for index, item in enumerate(result.questions, start=1):
        db.add(_question_schema_to_model(item, index, source.id))
        imported_count += 1
    warnings = _warnings_for_preview(result)
    batch = ImportBatch(
        id=str(uuid4()),
        source_name=resolved_source_name,
        source_id=source.id,
        format_version=result.format_version,
        imported_count=imported_count,
        skipped_count=0,
        warning_count=len(warnings),
        error_count=len(result.errors),
    )
    db.add(batch)
    db.commit()
    return ImportCommitResponse(
        imported_count=imported_count,
        skipped_count=0,
        warning_count=len(warnings),
        error_count=len(result.errors),
        batch_id=batch.id,
        extra={"reset": True, "hard_deleted": True, "format_version": result.format_version},
    )


def _resolve_source(text: str | None, source_name: str | None) -> tuple[str, str]:
    """中文说明：统一处理默认题库、粘贴文本和用户上传文件名。"""

    if text is None:
        return load_default_question_bank(), settings.question_bank_path.name
    normalized_name = (source_name or "粘贴文本").strip() or "粘贴文本"
    return text, normalized_name[:255]


def _get_or_create_source(db: Session, source_name: str) -> QuestionSource:
    """中文说明：按稳定规范化名称复用来源，避免同名追加产生多个业务分类。"""

    from app.database import normalize_source_name

    normalized_name = normalize_source_name(source_name)
    source = db.scalar(select(QuestionSource).where(QuestionSource.normalized_name == normalized_name))
    if source is not None:
        return source
    source = QuestionSource(id=uuid4().hex, name=source_name, normalized_name=normalized_name)
    db.add(source)
    db.flush()
    return source


def _warnings_for_preview(result: object) -> list[ImportWarningItem]:
    """中文说明：为旧格式增加一次迁移提示，避免用户误把它当作推荐模板。"""

    warnings = list(getattr(result, "warnings"))
    if getattr(result, "is_legacy"):
        warnings.insert(
            0,
            ImportWarningItem(
                field="format",
                message="当前为旧版兼容格式；建议迁移到 question-bank-format v2 后再维护题库。",
            ),
        )
    return warnings


def _find_database_conflicts(db: Session, questions: list[QuestionRead]) -> list[ImportConflictItem]:
    """中文说明：区分可安全跳过的相同题目和禁止静默覆盖的内容冲突。"""

    conflicts: list[ImportConflictItem] = []
    for item in questions:
        existing = db.get(Question, item.id)
        if existing is None and item.part_id:
            existing = db.scalar(select(Question).where(Question.part_id == item.part_id))
        if existing is None:
            continue
        if _question_content_matches(existing, item):
            conflicts.append(
                ImportConflictItem(
                    question_id=item.id,
                    part_id=item.part_id,
                    status="same",
                    message="数据库中已有内容相同的题目，追加导入时会跳过。",
                )
            )
        else:
            conflicts.append(
                ImportConflictItem(
                    question_id=item.id,
                    part_id=item.part_id,
                    status="different",
                    message="数据库中已有相同 ID 或 part_id 但内容不同的题目；为避免覆盖历史，不能直接导入。",
                )
            )
    return conflicts


def _question_content_matches(existing: Question, incoming: QuestionRead) -> bool:
    """中文说明：比较会影响练习语义的字段，忽略导入顺序、版本和格式空白。"""

    existing_payload = {
        "id": existing.id,
        "part_id": existing.part_id,
        "title": existing.title,
        "type": existing.type,
        "type_label": existing.type_label,
        "difficulty": existing.difficulty,
        "tags": existing.tags or [],
        "directions": existing.directions or [],
        "stem": existing.stem,
        "material": existing.material,
        "options": existing.options or [],
        "standard_answer": existing.standard_answer,
        "explanation": existing.explanation,
        "exam_points": existing.exam_points or [],
        "common_mistakes": existing.common_mistakes,
        "follow_up_question": existing.follow_up_question,
        "scoring_standard": existing.scoring_standard,
    }
    incoming_payload = {
        "id": incoming.id,
        "part_id": incoming.part_id,
        "title": incoming.title,
        "type": incoming.type,
        "type_label": incoming.type_label,
        "difficulty": incoming.difficulty,
        "tags": incoming.tags or [],
        # 与实际写库的兼容行为保持一致：旧题库没有 directions 时会回退到 exam_points。
        "directions": incoming.directions or incoming.exam_points or [],
        "stem": incoming.stem,
        "material": incoming.material,
        "options": [option.model_dump() for option in incoming.options],
        "standard_answer": incoming.standard_answer,
        "explanation": incoming.explanation,
        "exam_points": incoming.exam_points or [],
        "common_mistakes": incoming.common_mistakes,
        "follow_up_question": incoming.follow_up_question,
        "scoring_standard": incoming.scoring_standard,
    }
    return json.dumps(existing_payload, ensure_ascii=False, sort_keys=True) == json.dumps(incoming_payload, ensure_ascii=False, sort_keys=True)


def _ensure_committable(errors: list[object], conflicts: list[ImportConflictItem]) -> None:
    """中文说明：确保任何重置或追加动作都不会在错误题库上执行。"""

    if errors:
        raise ImportValidationError(f"题库存在 {len(errors)} 个阻断格式或题目错误，请在预览中修正后再导入。")
    changed = [item for item in conflicts if item.status == "different"]
    if changed:
        raise ImportValidationError(f"有 {len(changed)} 道题与数据库中的同 ID/part_id 题目内容不同，不能静默覆盖。")


def _hard_delete_all_question_data(db: Session) -> None:
    """中文说明：按依赖顺序物理删除旧题库数据，避免旧题残留。"""

    # AI 记录同样引用题目或答题记录；重置题库必须一并清除，避免孤儿数据
    # 在后续 AI 上下文、候选题或外键校验中指向已不存在的题目。
    db.query(AiGradingMessage).delete(synchronize_session=False)
    db.query(AiGradingResult).delete(synchronize_session=False)
    db.query(AiTutorMessage).delete(synchronize_session=False)
    db.query(AiTutorThread).delete(synchronize_session=False)
    db.query(AiQuestionCandidate).delete(synchronize_session=False)
    db.query(AiQuestionGeneration).delete(synchronize_session=False)
    db.query(Attempt).delete(synchronize_session=False)
    db.query(QuestionRevision).delete(synchronize_session=False)
    db.query(PracticeSession).delete(synchronize_session=False)
    db.query(UserQuestionState).delete(synchronize_session=False)
    db.query(ImportBatch).delete(synchronize_session=False)
    db.query(Question).delete(synchronize_session=False)
    db.query(QuestionSource).delete(synchronize_session=False)
    db.flush()


def _question_schema_to_model(item: QuestionRead, import_order: int | None = None, source_id: str | None = None) -> Question:
    """中文说明：将 API schema 转成 ORM 模型，并显式处理 JSON 字段。"""

    return Question(
        id=item.id,
        part_id=item.part_id,
        title=item.title,
        type=item.type,
        type_label=item.type_label,
        difficulty=item.difficulty,
        tags=item.tags,
        directions=item.directions or item.exam_points,
        import_order=import_order,
        source_id=source_id,
        stem=item.stem,
        material=item.material,
        options=[option.model_dump() for option in item.options],
        standard_answer=item.standard_answer,
        answer_text=item.answer_text,
        explanation=item.explanation,
        exam_points=item.exam_points,
        common_mistakes=item.common_mistakes,
        follow_up_question=item.follow_up_question,
        scoring_standard=item.scoring_standard,
        source_text=item.source_text,
        parse_warnings=item.parse_warnings,
    )
