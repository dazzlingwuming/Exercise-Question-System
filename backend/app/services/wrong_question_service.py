"""中文说明：错题分页、筛选和错误次数聚合服务。"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.attempt import Attempt
from app.models.question import Question


@dataclass
class WrongQuestionRow:
    """中文说明：错题页聚合展示的一行数据。"""

    attempt: Attempt
    question: Question
    wrong_count: int
    last_wrong_at: datetime | None
    last_wrong_answer: str


@dataclass
class WrongQuestionPage:
    """中文说明：错题分页响应的服务层结构。"""

    items: list[WrongQuestionRow]
    total: int
    page: int
    page_size: int
    has_next: bool


def list_wrong_questions(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    keyword: str | None = None,
    sort: str = "latest_wrong",
) -> WrongQuestionPage:
    """中文说明：按题目维度聚合错题，支持分页、筛选和排序。"""

    attempts = list(db.scalars(select(Attempt).where(Attempt.is_correct.is_(False)).order_by(Attempt.created_at.desc())).all())
    grouped: dict[str, list[Attempt]] = defaultdict(list)
    for attempt in attempts:
        grouped[attempt.question_id].append(attempt)
    rows: list[WrongQuestionRow] = []
    for question_id, question_attempts in grouped.items():
        question = db.get(Question, question_id)
        if not question or question.is_deleted or not _match_question(question, type, difficulty, exam_point, direction, keyword):
            continue
        latest = sorted(question_attempts, key=lambda item: item.created_at or datetime.min, reverse=True)[0]
        rows.append(WrongQuestionRow(latest, question, len(question_attempts), latest.created_at, latest.user_answer_raw))
    rows = _sort_rows(rows, sort)
    total = len(rows)
    start = max(page - 1, 0) * page_size
    return WrongQuestionPage(rows[start:start + page_size], total, page, page_size, start + page_size < total)


def _match_question(
    question: Question,
    type: str | None,
    difficulty: str | None,
    exam_point: str | None,
    direction: str | None,
    keyword: str | None,
) -> bool:
    """中文说明：判断错题是否满足筛选条件。"""

    if type and question.type != type and question.type_label != type:
        return False
    if difficulty and question.difficulty != difficulty:
        return False
    if exam_point and exam_point not in (question.exam_points or []):
        return False
    if direction and direction not in (question.directions or []):
        return False
    if keyword and keyword not in question.stem and keyword not in (question.explanation or ""):
        return False
    return True


def _sort_rows(rows: list[WrongQuestionRow], sort: str) -> list[WrongQuestionRow]:
    """中文说明：按最新错误、最早错误、导入顺序或错误次数排序。"""

    if sort == "oldest_wrong":
        return sorted(rows, key=lambda row: row.last_wrong_at or datetime.min)
    if sort == "import_order":
        return sorted(rows, key=lambda row: (row.question.import_order is None, row.question.import_order or 0))
    if sort == "wrong_count_desc":
        return sorted(rows, key=lambda row: row.wrong_count, reverse=True)
    return sorted(rows, key=lambda row: row.last_wrong_at or datetime.min, reverse=True)
