"""中文说明：记录单机用户对每道题的累计练习状态，用于抽题去重和复习筛选。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserQuestionState(Base):
    """中文说明：保存题目的累计作答状态；当前项目是本地单用户系统，user_id 固定为 local。"""

    __tablename__ = "user_question_states"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_question_state_user_question"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), default="local", index=True)
    question_id: Mapped[str] = mapped_column(String(80), index=True)
    current_question_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    consecutive_correct_count: Mapped[int] = mapped_column(Integer, default=0)
    consecutive_wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    last_attempt_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_result: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_answer_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_review_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    mastery_level: Mapped[int] = mapped_column(Integer, default=0)
    is_favorited: Mapped[bool] = mapped_column(Boolean, default=False)
    is_marked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_excluded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
