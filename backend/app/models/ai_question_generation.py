"""中文说明：AI 题目生成候选池模型。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiQuestionGeneration(Base):
    """中文说明：记录一次基于当前答题上下文的 AI 出题请求。"""

    __tablename__ = "ai_question_generations"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    source_question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    attempt_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    clicked_ai_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_type: Mapped[str] = mapped_column(String(50), index=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False)
    difficulty_strategy: Mapped[str] = mapped_column(String(30), nullable=False)
    generation_direction: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AiQuestionCandidate(Base):
    """中文说明：AI 生成但尚未确认入库的候选题。"""

    __tablename__ = "ai_question_candidates"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    generation_id: Mapped[str] = mapped_column(ForeignKey("ai_question_generations.id"), index=True)
    candidate_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    structure_validation_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    ai_validation_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    similar_questions_json: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False, index=True)
    accepted_question_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
