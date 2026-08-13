"""集合树管理 API 的请求和响应结构。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str
    parent_id: str | None = "collection_root"
    description: str | None = Field(default=None, max_length=1000)


class CollectionUpdate(BaseModel):
    name: str | None = None
    description: str | None = Field(default=None, max_length=1000)


class CollectionMove(BaseModel):
    target_parent_id: str | None = "collection_root"


class CollectionMerge(BaseModel):
    target_collection_id: str


class CollectionDelete(BaseModel):
    reason: str | None = None


class CollectionRead(BaseModel):
    id: str
    parent_id: str | None
    name: str
    description: str | None = None
    path: str
    is_system: bool
    is_deleted: bool
    deletion_id: str | None = None
    direct_question_count: int = 0
    total_question_count: int = 0
    children: list["CollectionRead"] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CollectionDeletionRead(BaseModel):
    id: str
    root_collection_id: str
    collection_ids: list[str]
    question_ids: list[str]
    reason: str | None = None
    restored_at: datetime | None = None
    created_at: datetime | None = None
