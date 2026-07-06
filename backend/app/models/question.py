"""中文说明：定义题目表，题目中的列表/对象字段使用 JSON 存储。"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Question(Base):
    """中文说明：保存一道可刷题目的完整结构化信息和原始 Markdown 片段。"""

    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    part_id: Mapped[str | None] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50), index=True)
    type_label: Mapped[str] = mapped_column(String(80), index=True)
    difficulty: Mapped[str | None] = mapped_column(String(80), index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    directions: Mapped[list[str]] = mapped_column(JSON, default=list)
    import_order: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    stem: Mapped[str] = mapped_column(Text)
    material: Mapped[str | None] = mapped_column(Text)
    options: Mapped[list[dict]] = mapped_column(JSON, default=list)
    standard_answer: Mapped[object | None] = mapped_column(JSON)
    answer_text: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    exam_points: Mapped[list[str]] = mapped_column(JSON, default=list)
    common_mistakes: Mapped[str | None] = mapped_column(Text)
    follow_up_question: Mapped[str | None] = mapped_column(Text)
    scoring_standard: Mapped[str | None] = mapped_column(Text)
    source_text: Mapped[str] = mapped_column(Text)
    parse_warnings: Mapped[list[str]] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delete_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
