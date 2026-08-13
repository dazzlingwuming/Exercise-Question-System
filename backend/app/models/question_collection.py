"""集合树及集合删除操作的持久化模型。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


ROOT_COLLECTION_ID = "collection_root"
UNFILED_COLLECTION_ID = "collection_unfiled"


class QuestionCollection(Base):
    """题目所属集合，可同时拥有直接题目和子集合。"""

    __tablename__ = "question_collections"
    __table_args__ = (UniqueConstraint("parent_id", "normalized_name", name="uq_question_collections_parent_normalized_name"),)

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("question_collections.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    collection_deletion_id: Mapped[str | None] = mapped_column(ForeignKey("collection_deletions.id"), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class CollectionDeletion(Base):
    """一次集合子树软删除的精确恢复记录。"""

    __tablename__ = "collection_deletions"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    root_collection_id: Mapped[str] = mapped_column(String(80), index=True)
    collection_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    question_ids: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    restored_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
