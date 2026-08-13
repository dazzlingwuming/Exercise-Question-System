"""中文说明：定义导入批次表，记录每次确认导入的数量和来源。"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.question_source import QuestionSource  # noqa: F401


class ImportBatch(Base):
    """中文说明：保存导入操作摘要，便于后续追踪题库来源和重复导入情况。"""

    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    # 保留当次导入填写的审计值；稳定归类以 source_id 指向的 QuestionSource 为准。
    source_name: Mapped[str] = mapped_column(String(255))
    source_id: Mapped[str | None] = mapped_column(ForeignKey("question_sources.id"), index=True, nullable=True)
    format_version: Mapped[str] = mapped_column(String(20), default="legacy", nullable=False)
    imported_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source: Mapped["QuestionSource | None"] = relationship(back_populates="import_batches")
