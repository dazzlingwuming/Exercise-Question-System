"""Bounded, decoded image storage and Markdown reference validation.

Images are immutable and intentionally never garbage collected: revisions, attempts,
deleted questions and abandoned drafts may still refer to them.
"""

from __future__ import annotations

import hashlib
from io import BytesIO
from pathlib import Path
import re
import warnings
from uuid import uuid4

from markdown_it import MarkdownIt
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.media_asset import MediaAsset

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_SIDE = 8192
MAX_IMAGE_PIXELS = 16_000_000
MAX_QUESTION_IMAGES = 6
MAX_QUESTION_IMAGE_BYTES = 20 * 1024 * 1024
MEDIA_URL_PATTERN = re.compile(r"^/api/media/images/([a-f0-9]{32})$")
FORMATS = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
EXTENSIONS = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
_markdown = MarkdownIt("commonmark")
# Parse even unsafe destinations so validation rejects them instead of hiding them.
_markdown.validateLink = lambda url: True


class MediaError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, field: str | None = None):
        super().__init__(message)
        self.code, self.message, self.status_code, self.field = code, message, status_code, field


def media_root() -> Path:
    return settings.data_dir / "media"


def asset_path(asset: MediaAsset) -> Path:
    if not re.fullmatch(r"[a-f0-9]{32}", asset.id) or asset.mime_type not in EXTENSIONS:
        raise MediaError("MEDIA_NOT_FOUND", "图片资源不存在。", 404)
    return media_root() / f"{asset.id}{EXTENSIONS[asset.mime_type]}"


def decode_image(data: bytes) -> tuple[str, int, int]:
    if len(data) > MAX_IMAGE_BYTES:
        raise MediaError("MEDIA_TOO_LARGE", "单张图片不能超过 5 MiB。", 413)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                mime_type = FORMATS.get(image.format or "")
                if not mime_type or getattr(image, "is_animated", False):
                    raise MediaError("UNSUPPORTED_IMAGE_TYPE", "仅支持静态 PNG、JPEG、WebP 图片。", 415)
                width, height = image.size
                if max(width, height) > MAX_IMAGE_SIDE or width * height > MAX_IMAGE_PIXELS:
                    raise MediaError("IMAGE_DIMENSIONS_EXCEEDED", "图片单边不能超过 8192 像素，总像素不能超过 1600 万。")
                image.verify()
            # verify() alone does not decode the pixel data of every format.
            with Image.open(BytesIO(data)) as image:
                image.load()
        return mime_type, width, height
    except MediaError:
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise MediaError("IMAGE_DIMENSIONS_EXCEEDED", "图片像素过大，无法安全处理。") from exc
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise MediaError("INVALID_IMAGE", "文件不是有效图片或已损坏，请重新选择。", 415) from exc


def store_image(db: Session, data: bytes) -> MediaAsset:
    mime_type, width, height = decode_image(data)
    asset = MediaAsset(id=uuid4().hex, mime_type=mime_type, size_bytes=len(data), width=width,
                       height=height, sha256=hashlib.sha256(data).hexdigest())
    path = asset_path(asset)
    path.parent.mkdir(parents=True, exist_ok=True)
    committed = False
    try:
        with path.open("xb") as output:
            output.write(data)
        db.add(asset)
        db.commit()
        committed = True
        db.refresh(asset)
    except Exception:
        db.rollback()
        if not committed:
            path.unlink(missing_ok=True)
        raise
    return asset


def get_asset(db: Session, asset_id: str) -> MediaAsset:
    if not re.fullmatch(r"[a-f0-9]{32}", asset_id):
        raise MediaError("MEDIA_NOT_FOUND", "图片资源不存在。", 404)
    if db is None:
        raise MediaError("MEDIA_NOT_FOUND", "无法验证图片资源，请通过应用导入预览。")
    asset = db.get(MediaAsset, asset_id)
    if not asset or not asset_path(asset).is_file():
        raise MediaError("MEDIA_NOT_FOUND", "图片资源不存在，请重新上传。", 404)
    return asset


def read_image(asset: MediaAsset) -> bytes:
    try:
        with asset_path(asset).open("rb") as source:
            data = source.read(MAX_IMAGE_BYTES + 1)
    except OSError as exc:
        raise MediaError("MEDIA_NOT_FOUND", "图片文件不可用，请重新上传。", 404) from exc
    if len(data) != asset.size_bytes or hashlib.sha256(data).hexdigest() != asset.sha256:
        raise MediaError("INVALID_IMAGE", "图片文件已损坏，请重新上传。")
    return data


def markdown_images(source: str):
    """Use a real Markdown parser: reference images count, code examples do not."""
    for token in _markdown.parse(source):
        for child in token.children or []:
            if child.type == "image":
                yield child.attrGet("src") or "", child.content


def content_fields(data: dict, submitted: bool = True):
    for field in ("stem", "material"):
        yield field, str(data.get(field) or "")
    for index, option in enumerate(data.get("options") or []):
        if hasattr(option, "model_dump"):
            option = option.model_dump()
        yield f"options[{index}].text", str(option.get("text") or "")
    if submitted:
        for field in ("standard_answer", "explanation", "common_mistakes", "follow_up_question", "scoring_standard", "user_answer"):
            value = data.get(field)
            if isinstance(value, str):
                yield field, value


def question_images(db: Session, data: dict, submitted: bool = True) -> list[tuple[str, str, MediaAsset]]:
    images = []
    seen = set()
    for field, source in content_fields(data, submitted):
        for url, alt in markdown_images(source):
            match = MEDIA_URL_PATTERN.fullmatch(url)
            if not match:
                raise MediaError("INVALID_IMAGE_REFERENCE", f"{field} 中的图片必须先上传，不能使用外网或本机路径。", field=field)
            asset_id = match[1]
            if asset_id in seen:
                continue
            seen.add(asset_id)
            try:
                asset = get_asset(db, asset_id)
            except MediaError as exc:
                raise MediaError(exc.code, f"{field} 中的图片不可用，请重新上传。", field=field) from exc
            images.append((field, alt, asset))
    if len(images) > MAX_QUESTION_IMAGES:
        raise MediaError("TOO_MANY_IMAGES", "每道题最多使用 6 张不同图片。")
    if sum(asset.size_bytes for _, _, asset in images) > MAX_QUESTION_IMAGE_BYTES:
        raise MediaError("QUESTION_IMAGES_TOO_LARGE", "每道题图片合计不能超过 20 MiB。")
    return images
