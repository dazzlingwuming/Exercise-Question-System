"""中文说明：题库导入预览和确认导入 API。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.import_schema import ImportCommitRequest, ImportCommitResponse, ImportPreviewRequest, ImportPreviewResponse
from app.services.import_service import commit_import, preview_import, reset_and_commit_import

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/preview", response_model=ImportPreviewResponse)
def preview(payload: ImportPreviewRequest) -> ImportPreviewResponse:
    """中文说明：解析题库但不写入数据库。"""

    return preview_import(payload.text)


@router.post("/commit", response_model=ImportCommitResponse)
def commit(payload: ImportCommitRequest, db: Session = Depends(get_db)) -> ImportCommitResponse:
    """中文说明：确认导入并按 part_id 跳过重复题。"""

    return commit_import(db, payload.text)


@router.post("/reset-commit", response_model=ImportCommitResponse)
def reset_commit(payload: ImportCommitRequest, db: Session = Depends(get_db)) -> ImportCommitResponse:
    """中文说明：物理清空旧题库和依赖数据后重新导入。"""

    return reset_and_commit_import(db, payload.text)
