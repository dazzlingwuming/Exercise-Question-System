"""中文说明：AI 讲题助手的 thread 和 message 持久化模型。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiTutorThread(Base):
    """中文说明：同一道题、同一次 attempt 维度的连续 AI 对话。"""

    __tablename__ = "ai_tutor_threads"
    __table_args__ = (UniqueConstraint("question_id", "attempt_id", name="uq_ai_thread_question_attempt"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    attempt_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    current_stage: Mapped[str] = mapped_column(String(50), default="not_submitted")
    has_hint: Mapped[bool] = mapped_column(Boolean, default=False)
    has_explanation: Mapped[bool] = mapped_column(Boolean, default=False)
    has_engineering_example: Mapped[bool] = mapped_column(Boolean, default=False)
    has_interview_followup: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class AiTutorMessage(Base):
    """中文说明：保存用户和 AI 助手的每轮消息。"""

    __tablename__ = "ai_tutor_messages"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    thread_id: Mapped[str] = mapped_column(ForeignKey("ai_tutor_threads.id"), index=True)
    role: Mapped[str] = mapped_column(String(30))
    stage: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
