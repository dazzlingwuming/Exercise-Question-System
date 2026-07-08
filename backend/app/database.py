"""中文说明：负责创建 SQLite 连接、会话依赖和数据库初始化。"""

from collections.abc import Generator

import json
import re

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """中文说明：所有 SQLAlchemy ORM 模型的声明基类。"""


settings.data_dir.mkdir(parents=True, exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """中文说明：FastAPI 依赖使用的数据库会话生成器，请求结束后自动关闭。"""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """中文说明：本地应用启动时自动创建缺失的数据表，并执行轻量字段迁移。"""

    from app.models import ai_grading, ai_question_generation, ai_tutor, attempt, import_batch, practice_session, question, question_revision, user_question_state  # noqa: F401

    Base.metadata.create_all(bind=engine)
    run_lightweight_migrations()


def run_lightweight_migrations() -> None:
    """中文说明：为已有 SQLite 数据库补新增字段，避免用户手动删库重建。"""

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        if "questions" in existing_tables:
            question_columns = {column["name"] for column in inspector.get_columns("questions")}
            if "version" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN version INTEGER NOT NULL DEFAULT 1"))
            if "updated_at" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN updated_at DATETIME"))
            if "import_order" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN import_order INTEGER"))
            if "directions" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN directions JSON"))
            if "is_deleted" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0"))
            if "deleted_at" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN deleted_at DATETIME"))
            if "delete_reason" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN delete_reason TEXT"))
            if "deleted_source" not in question_columns:
                connection.execute(text("ALTER TABLE questions ADD COLUMN deleted_source VARCHAR(80)"))
        if "attempts" in existing_tables:
            attempt_columns = {column["name"] for column in inspector.get_columns("attempts")}
            if "question_version" not in attempt_columns:
                connection.execute(text("ALTER TABLE attempts ADD COLUMN question_version INTEGER"))
            if "question_snapshot" not in attempt_columns:
                connection.execute(text("ALTER TABLE attempts ADD COLUMN question_snapshot JSON"))
            if "practice_session_id" not in attempt_columns:
                connection.execute(text("ALTER TABLE attempts ADD COLUMN practice_session_id VARCHAR(80)"))
    backfill_question_order_and_directions()
    backfill_user_question_states()


def backfill_question_order_and_directions() -> None:
    """中文说明：给旧题库补 import_order 和 directions，保证已有数据库也能专项练习。"""

    with engine.begin() as connection:
        rows = connection.execute(
            text("SELECT id, part_id, created_at, directions, exam_points, import_order FROM questions")
        ).mappings().all()
        sorted_rows = sorted(rows, key=lambda row: (_part_sort_key(row["part_id"]), str(row["created_at"] or ""), str(row["id"])))
        for index, row in enumerate(sorted_rows, start=1):
            updates: dict[str, object] = {}
            if row["import_order"] is None:
                updates["import_order"] = index
            if not _json_list(row["directions"]):
                updates["directions"] = json.dumps(_json_list(row["exam_points"]), ensure_ascii=False)
            if updates:
                set_sql = ", ".join(f"{key} = :{key}" for key in updates)
                connection.execute(text(f"UPDATE questions SET {set_sql} WHERE id = :id"), {**updates, "id": row["id"]})


def _part_sort_key(part_id: str | None) -> tuple[int, ...]:
    """中文说明：把 Part 2-015 这类编号转成自然排序 key，无法解析时放到最后。"""

    if not part_id:
        return (9999, 999999)
    numbers = [int(item) for item in re.findall(r"\d+", part_id)]
    return tuple(numbers) if numbers else (9999, 999999)


def _json_list(raw: object) -> list[str]:
    """中文说明：兼容 SQLite JSON 读出的字符串/列表，统一转为字符串列表。"""

    if raw is None:
        return []
    value = raw
    if isinstance(raw, str):
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            return []
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def backfill_user_question_states() -> None:
    """中文说明：从旧答题记录回填累计状态；已有状态不覆盖，避免破坏用户新进度。"""

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if "attempts" not in existing_tables or "user_question_states" not in existing_tables:
        return
    with engine.begin() as connection:
        existing_count = connection.execute(text("SELECT COUNT(*) FROM user_question_states")).scalar_one()
        if existing_count:
            return
        attempts = connection.execute(
            text(
                """
                SELECT id, question_id, question_version, user_answer_raw, is_correct, review_status, created_at
                FROM attempts
                ORDER BY created_at ASC, id ASC
                """
            )
        ).mappings().all()
        grouped: dict[str, list[object]] = {}
        for attempt in attempts:
            grouped.setdefault(str(attempt["question_id"]), []).append(attempt)
        for question_id, rows in grouped.items():
            attempt_count = len(rows)
            correct_count = sum(1 for row in rows if row["is_correct"] == 1)
            wrong_count = sum(1 for row in rows if row["is_correct"] == 0)
            last = rows[-1]
            last_result = "correct" if last["is_correct"] == 1 else "wrong" if last["is_correct"] == 0 else "ungraded"
            status = "correct" if last_result == "correct" else "wrong" if last_result == "wrong" else "attempted"
            connection.execute(
                text(
                    """
                    INSERT INTO user_question_states (
                        id, user_id, question_id, current_question_version, status, attempt_count,
                        correct_count, wrong_count, consecutive_correct_count, consecutive_wrong_count,
                        last_attempt_id, last_attempt_at, last_result, last_answer_snapshot, mastery_level,
                        is_favorited, is_marked, is_excluded
                    )
                    VALUES (
                        :id, 'local', :question_id, :question_version, :status, :attempt_count,
                        :correct_count, :wrong_count, :consecutive_correct_count, :consecutive_wrong_count,
                        :last_attempt_id, :last_attempt_at, :last_result, :last_answer_snapshot, :mastery_level,
                        0, 0, 0
                    )
                    """
                ),
                {
                    "id": f"local:{question_id}",
                    "question_id": question_id,
                    "question_version": last["question_version"],
                    "status": status,
                    "attempt_count": attempt_count,
                    "correct_count": correct_count,
                    "wrong_count": wrong_count,
                    "consecutive_correct_count": 1 if last_result == "correct" else 0,
                    "consecutive_wrong_count": 1 if last_result == "wrong" else 0,
                    "last_attempt_id": last["id"],
                    "last_attempt_at": last["created_at"],
                    "last_result": last_result,
                    "last_answer_snapshot": last["user_answer_raw"],
                    "mastery_level": min(5, correct_count),
                },
            )
