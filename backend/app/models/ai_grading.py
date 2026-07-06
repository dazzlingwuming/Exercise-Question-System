"""中文说明：保存 AI 主观题评分卡，和原始答题记录解耦。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiGradingResult(Base):
    """中文说明：一次 AI 评分结果；多次重评会保留多条历史。"""

    __tablename__ = "ai_grading_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(80), default="local", index=True)
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"), index=True)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    provider: Mapped[str] = mapped_column(String(50), default="deepseek")
    model: Mapped[str] = mapped_column(String(120))
    rubric_version: Mapped[str] = mapped_column(String(30), default="v1")
    score: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float, default=10.0)
    level: Mapped[str] = mapped_column(String(30))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)


class AiGradingMessage(Base):
    """中文说明：围绕某一次评分卡的追问对话，不影响评分结果本身。"""

    __tablename__ = "ai_grading_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    grading_id: Mapped[int] = mapped_column(ForeignKey("ai_grading_results.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
