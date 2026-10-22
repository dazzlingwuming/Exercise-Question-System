"""Upload and serve immutable local images; never expose a filesystem path."""

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.media_service import MAX_IMAGE_BYTES, MediaError, asset_path, get_asset, read_image, store_image

router = APIRouter(prefix="/media/images", tags=["media"])


class MediaImageRead(BaseModel):
    id: str
    url: str
    mime_type: str
    size_bytes: int
    width: int
    height: int


@router.post("", response_model=MediaImageRead, status_code=201)
async def upload_image(file: UploadFile, db: Session = Depends(get_db)) -> MediaImageRead:
    try:
        data = await file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise MediaError("MEDIA_TOO_LARGE", "单张图片不能超过 5 MiB。", 413)
        asset = store_image(db, data)
        return MediaImageRead(id=asset.id, url=f"/api/media/images/{asset.id}", mime_type=asset.mime_type,
                              size_bytes=asset.size_bytes, width=asset.width, height=asset.height)
    finally:
        await file.close()


@router.get("/{asset_id}")
def image_file(asset_id: str, db: Session = Depends(get_db)) -> FileResponse:
    asset = get_asset(db, asset_id)
    read_image(asset)
    return FileResponse(asset_path(asset), media_type=asset.mime_type,
                        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=31536000, immutable"})
