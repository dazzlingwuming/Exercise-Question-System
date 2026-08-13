"""集合树管理 API。"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.collection import (
    CollectionCreate,
    CollectionDelete,
    CollectionDeletionRead,
    CollectionMerge,
    CollectionMove,
    CollectionRead,
    CollectionUpdate,
)
from app.services.collection_service import (
    CollectionError,
    create_collection,
    delete_collection_tree,
    get_collection_tree,
    list_deleted_collections,
    merge_collection,
    move_collection,
    restore_collection_tree,
    update_collection,
)

router = APIRouter(prefix="/collections", tags=["collections"])


def _raise(error: CollectionError) -> None:
    raise HTTPException(status_code=error.status_code, detail=error.detail()) from error


@router.get("/tree", response_model=list[CollectionRead])
def tree_api(db: Session = Depends(get_db)) -> list[CollectionRead]:
    return get_collection_tree(db)


@router.get("/deleted", response_model=list[CollectionRead])
def deleted_api(db: Session = Depends(get_db)) -> list[CollectionRead]:
    return list_deleted_collections(db)


@router.post("", response_model=CollectionRead, status_code=201)
def create_api(payload: CollectionCreate, db: Session = Depends(get_db)) -> CollectionRead:
    try:
        return create_collection(db, payload)
    except CollectionError as error:
        _raise(error)


@router.patch("/{collection_id}", response_model=CollectionRead)
def update_api(collection_id: str, payload: CollectionUpdate, db: Session = Depends(get_db)) -> CollectionRead:
    try:
        return update_collection(db, collection_id, payload)
    except CollectionError as error:
        _raise(error)


@router.post("/{collection_id}/move", response_model=CollectionRead)
def move_api(collection_id: str, payload: CollectionMove, db: Session = Depends(get_db)) -> CollectionRead:
    try:
        return move_collection(db, collection_id, payload.target_parent_id)
    except CollectionError as error:
        _raise(error)


@router.post("/{collection_id}/merge", response_model=CollectionRead)
def merge_api(collection_id: str, payload: CollectionMerge, db: Session = Depends(get_db)) -> CollectionRead:
    try:
        return merge_collection(db, collection_id, payload.target_collection_id)
    except CollectionError as error:
        _raise(error)


@router.delete("/{collection_id}", response_model=CollectionDeletionRead)
def delete_api(collection_id: str, payload: CollectionDelete | None = None, db: Session = Depends(get_db)) -> CollectionDeletionRead:
    try:
        return delete_collection_tree(db, collection_id, payload.reason if payload else None)
    except CollectionError as error:
        _raise(error)


@router.post("/deletions/{deletion_id}/restore", response_model=CollectionDeletionRead)
def restore_api(deletion_id: str, db: Session = Depends(get_db)) -> CollectionDeletionRead:
    try:
        return restore_collection_tree(db, deletion_id)
    except CollectionError as error:
        _raise(error)
