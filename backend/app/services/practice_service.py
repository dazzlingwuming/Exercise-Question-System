"""中文说明：练习模式查询服务，集中处理随机、顺序、错题、未答题和专项练习。"""

from __future__ import annotations

import random
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.question import Question
from app.services.user_question_state_service import answered_question_ids, due_question_ids, wrong_question_ids


PRACTICE_MODES = [
    {"key": "random", "label": "随机未答题"},
    {"key": "sequential", "label": "顺序未答题"},
    {"key": "wrong", "label": "错题专项"},
    {"key": "due_review", "label": "到期复习"},
    {"key": "all_practice", "label": "全量练习"},
    {"key": "unanswered", "label": "未答题"},
    {"key": "type", "label": "按题型"},
    {"key": "difficulty", "label": "按难度"},
    {"key": "exam_point", "label": "按考察点"},
    {"key": "direction", "label": "按方向"},
]


@dataclass
class PracticeQueryResult:
    """中文说明：练习候选题分页结果。"""

    items: list[Question]
    total: int
    page: int
    page_size: int
    has_next: bool


def build_practice_questions(
    db: Session,
    mode: str = "random",
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    only_wrong: bool = False,
    only_unanswered: bool = False,
    order: str = "import_order",
    page: int = 1,
    page_size: int = 20,
    start_question_id: str | None = None,
    allow_answered: bool = False,
) -> PracticeQueryResult:
    """
    中文说明：
    根据用户选择的练习模式和筛选条件构建题目候选集。
    这里集中处理随机、顺序、错题、未答题、方向专项等模式，
    避免 router 中堆积大量 if/else。
    """

    items = _base_questions(db)
    items = _apply_common_filters(items, type, difficulty, exam_point, direction)
    if mode == "wrong" or only_wrong:
        wrong_ids = wrong_question_ids(db)
        items = [item for item in items if item.id in wrong_ids]
    elif mode == "due_review":
        due_ids = due_question_ids(db)
        items = [item for item in items if item.id in due_ids]
    elif mode == "unanswered" or only_unanswered or _should_exclude_answered(mode, allow_answered):
        answered_ids = answered_question_ids(db)
        items = [item for item in items if item.id not in answered_ids]
    if start_question_id:
        items = _rotate_to_start(items, start_question_id)
    elif mode == "random" or order == "random":
        random.shuffle(items)
    else:
        items = _sort_questions(items, order)
    total = len(items)
    start = max(page - 1, 0) * page_size
    page_items = items[start:start + page_size]
    return PracticeQueryResult(page_items, total, page, page_size, start + page_size < total)


def get_next_practice_question(
    db: Session,
    mode: str = "random",
    current_question_id: str | None = None,
    type: str | None = None,
    difficulty: str | None = None,
    exam_point: str | None = None,
    direction: str | None = None,
    order: str = "import_order",
) -> Question | None:
    """中文说明：根据当前题和练习模式返回下一题，顺序模式按候选集向后推进。"""

    result = build_practice_questions(
        db,
        mode=mode,
        type=type,
        difficulty=difficulty,
        exam_point=exam_point,
        direction=direction,
        order=order,
        page=1,
        page_size=10000,
    )
    items = result.items
    if not items:
        return None
    if mode == "random" and not current_question_id:
        return items[0]
    if not current_question_id:
        return items[0]
    for index, item in enumerate(items):
        if item.id == current_question_id:
            return items[index + 1] if index + 1 < len(items) else None
    return items[0]


def _base_questions(db: Session) -> list[Question]:
    """中文说明：按导入顺序读取全部题目，后续在服务层做 JSON 字段筛选。"""

    return list(
        db.scalars(
            select(Question)
            .where(Question.is_deleted.is_(False))
            .order_by(Question.import_order.asc().nulls_last(), Question.part_id)
        ).all()
    )


def _apply_common_filters(
    items: list[Question],
    type: str | None,
    difficulty: str | None,
    exam_point: str | None,
    direction: str | None,
) -> list[Question]:
    """中文说明：应用题型、难度、考察点和方向筛选。"""

    if type:
        items = [item for item in items if item.type == type or item.type_label == type]
    if difficulty:
        items = [item for item in items if item.difficulty == difficulty]
    if exam_point:
        items = [item for item in items if exam_point in (item.exam_points or [])]
    if direction:
        items = [item for item in items if direction in (item.directions or [])]
    return items


def _rotate_to_start(items: list[Question], start_question_id: str) -> list[Question]:
    """中文说明：把指定题目移动到候选集开头，用于错题页点某题后直接练习。"""

    for index, item in enumerate(items):
        if item.id == start_question_id:
            return items[index:] + items[:index]
    return items


def _sort_questions(items: list[Question], order: str) -> list[Question]:
    """中文说明：按导入顺序或题目 id 稳定排序，随机排序在外层处理。"""

    if order == "id":
        return sorted(items, key=lambda item: item.id)
    return sorted(items, key=lambda item: (item.import_order is None, item.import_order or 0, item.id))


def _should_exclude_answered(mode: str, allow_answered: bool) -> bool:
    """中文说明：新题类练习默认排除已答题；只有明确全量/复习类模式允许复刷。"""

    if allow_answered or mode in {"all_practice", "wrong", "due_review"}:
        return False
    return mode in {"random", "sequential", "type", "difficulty", "exam_point", "direction"}
