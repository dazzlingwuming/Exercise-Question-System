"""中文说明：负责题库解析预览和正式写入 SQLite。"""

from __future__ import annotations

from collections import Counter
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.attempt import Attempt
from app.models.import_batch import ImportBatch
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.models.user_question_state import UserQuestionState
from app.parsers.markdown_parser import parse_markdown_question_bank
from app.schemas.import_schema import ImportCommitResponse, ImportPreviewResponse
from app.schemas.question import QuestionRead


def load_default_question_bank() -> str:
    """中文说明：读取根目录题库文件，导入预览默认使用它作为数据源。"""

    return settings.question_bank_path.read_text(encoding="utf-8")


def preview_import(text: str | None = None) -> ImportPreviewResponse:
    """中文说明：只解析不入库，用于前端确认导入前检查 warning/error。"""

    raw_text = text if text is not None else load_default_question_bank()
    result = parse_markdown_question_bank(raw_text)
    type_distribution = Counter(question.type_label for question in result.questions)
    difficulty_distribution = Counter(question.difficulty or "未标注" for question in result.questions)
    return ImportPreviewResponse(
        source_name=settings.question_bank_path.name if text is None else "粘贴文本",
        success_count=len(result.questions),
        type_distribution=dict(type_distribution),
        difficulty_distribution=dict(difficulty_distribution),
        questions=result.questions[:100],
        warnings=result.warnings,
        errors=result.errors,
    )


def commit_import(db: Session, text: str | None = None) -> ImportCommitResponse:
    """中文说明：重新解析题库并写入数据库，按 part_id 跳过重复题目。"""

    raw_text = text if text is not None else load_default_question_bank()
    result = parse_markdown_question_bank(raw_text)
    imported_count = 0
    skipped_count = 0
    for index, item in enumerate(result.questions, start=1):
        exists = db.scalar(select(Question).where(Question.part_id == item.part_id))
        if exists:
            skipped_count += 1
            continue
        db.add(_question_schema_to_model(item, index))
        imported_count += 1

    batch = ImportBatch(
        id=str(uuid4()),
        source_name=settings.question_bank_path.name if text is None else "粘贴文本",
        imported_count=imported_count,
        skipped_count=skipped_count,
        warning_count=len(result.warnings),
        error_count=len(result.errors),
    )
    db.add(batch)
    db.commit()
    return ImportCommitResponse(
        imported_count=imported_count,
        skipped_count=skipped_count,
        warning_count=len(result.warnings),
        error_count=len(result.errors),
        batch_id=batch.id,
    )


def reset_and_commit_import(db: Session, text: str | None = None) -> ImportCommitResponse:
    """中文说明：物理清空旧题库及其依赖数据，然后重新导入当前题库。"""

    raw_text = text if text is not None else load_default_question_bank()
    result = parse_markdown_question_bank(raw_text)
    _hard_delete_all_question_data(db)
    imported_count = 0
    for index, item in enumerate(result.questions, start=1):
        db.add(_question_schema_to_model(item, index))
        imported_count += 1
    batch = ImportBatch(
        id=str(uuid4()),
        source_name=settings.question_bank_path.name if text is None else "粘贴文本",
        imported_count=imported_count,
        skipped_count=0,
        warning_count=len(result.warnings),
        error_count=len(result.errors),
    )
    db.add(batch)
    db.commit()
    return ImportCommitResponse(
        imported_count=imported_count,
        skipped_count=0,
        warning_count=len(result.warnings),
        error_count=len(result.errors),
        batch_id=batch.id,
        extra={"reset": True, "hard_deleted": True},
    )


def _hard_delete_all_question_data(db: Session) -> None:
    """中文说明：按依赖顺序物理删除旧题库数据，避免旧题残留。"""

    db.query(Attempt).delete(synchronize_session=False)
    db.query(QuestionRevision).delete(synchronize_session=False)
    db.query(PracticeSession).delete(synchronize_session=False)
    db.query(UserQuestionState).delete(synchronize_session=False)
    db.query(ImportBatch).delete(synchronize_session=False)
    db.query(Question).delete(synchronize_session=False)
    db.flush()


def _question_schema_to_model(item: QuestionRead, import_order: int | None = None) -> Question:
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
