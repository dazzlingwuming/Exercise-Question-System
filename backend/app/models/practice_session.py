"""中文说明：定义稳定练习会话表，用于按组连续刷题和刷新恢复。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PracticeSession(Base):
    """中文说明：保存一次练习的题目快照、游标和分组配置。"""

    __tablename__ = "practice_sessions"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    mode: Mapped[str] = mapped_column(String(50), index=True)
    filters_json: Mapped[dict] = mapped_column(JSON, default=dict)
    order: Mapped[str] = mapped_column(String(50), default="import_order")
    page_size: Mapped[int] = mapped_column(Integer, default=20)
    total: Mapped[int] = mapped_column(Integer, default=0)
    current_index: Mapped[int] = mapped_column(Integer, default=0)
    question_ids_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
