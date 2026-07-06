"""中文说明：定义答题记录表，用于错题、统计和主观题自评。"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Attempt(Base):
    """中文说明：记录用户一次提交，包括原始答案、归一化答案和判分结果。"""

    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    practice_session_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    user_answer_raw: Mapped[str] = mapped_column(Text)
    user_answer_normalized: Mapped[object | None] = mapped_column(JSON)
    correct_answer_normalized: Mapped[object | None] = mapped_column(JSON)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    question_version: Mapped[int | None] = mapped_column(nullable=True)
    question_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
