"""中文说明：定义导入批次表，记录每次确认导入的审计名称和目标集合。"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.question_source import QuestionSource  # noqa: F401
from app.models.question_collection import QuestionCollection  # noqa: F401


class ImportBatch(Base):
    """中文说明：保存导入操作摘要，便于追踪批次、目标集合和重复导入情况。"""

    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    # 兼容保留旧列名：source_name 现在只保存批次审计名称，题目归类以 collection_id 为准。
    source_name: Mapped[str] = mapped_column(String(255))
    source_id: Mapped[str | None] = mapped_column(ForeignKey("question_sources.id"), index=True, nullable=True)
    collection_id: Mapped[str | None] = mapped_column(ForeignKey("question_collections.id"), index=True, nullable=True)
    format_version: Mapped[str] = mapped_column(String(20), default="legacy", nullable=False)
    imported_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    warning_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    source: Mapped["QuestionSource | None"] = relationship(back_populates="import_batches")
