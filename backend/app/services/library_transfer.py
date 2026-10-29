"""Consistent desktop library snapshots; never mutate the selected source."""

from pathlib import Path
from contextlib import closing
import json
import re
import shutil
import sqlite3
from datetime import datetime, timezone

DATABASE_NAME = "question_practice.sqlite3"
IMAGE_NAME = re.compile(r"^[a-f0-9]{32}\.(png|jpg|webp)$")


def readonly_connection(path: Path):
    return sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)


def inspect_library(root: Path) -> dict:
    root = root.resolve(strict=True)
    database = root / DATABASE_NAME
    if not database.is_file() or database.is_symlink():
        raise ValueError(f"请选择包含 {DATABASE_NAME} 的资料库目录。")
    with closing(readonly_connection(database)) as db:
        if db.execute("PRAGMA quick_check").fetchone()[0] != "ok":
            raise ValueError("数据库检查未通过，请使用其他备份。")
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if "questions" not in tables:
            raise ValueError("该文件不是小鲸题库数据库。")
        questions = db.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
        conversations = db.execute("SELECT COUNT(*) FROM studio_conversations").fetchone()[0] if "studio_conversations" in tables else 0
        assets = db.execute("SELECT id, mime_type FROM media_assets").fetchall() if "media_assets" in tables else []
    suffixes = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    for asset_id, mime in assets:
        name = str(asset_id) + suffixes.get(mime, ".invalid")
        image = root / "media" / name
        if not IMAGE_NAME.fullmatch(name) or not image.is_file() or image.is_symlink() or image.parent.is_symlink():
            raise ValueError("资料库缺少图片或含无效图片路径，请同时选择完整的数据库和 media 目录。")
    return {"questions": questions, "conversations": conversations, "images": len(assets)}


def copy_library(source: Path, destination: Path) -> dict:
    source = source.resolve(strict=True)
    destination = destination.resolve()
    if destination == source or destination.is_relative_to(source) or destination.exists():
        raise ValueError("目标必须是资料库之外的全新目录。")
    inspect_library(source)
    destination.mkdir(parents=True, exist_ok=False)
    # sqlite.backup captures a consistent database while the source is running.
    with closing(readonly_connection(source / DATABASE_NAME)) as incoming, closing(sqlite3.connect(destination / DATABASE_NAME)) as outgoing:
        incoming.backup(outgoing)
    media = source / "media"
    if media.exists():
        if media.is_symlink():
            raise ValueError("不能复制指向其他位置的图片目录。")
        (destination / "media").mkdir()
        for image in media.iterdir():
            if IMAGE_NAME.fullmatch(image.name) and image.is_file() and not image.is_symlink():
                shutil.copyfile(image, destination / "media" / image.name)
    # Re-validate against the captured DB, not only the earlier preflight read.
    summary = inspect_library(destination)
    (destination / "xiaojing-backup.json").write_text(json.dumps({"format": 1, "created_at": datetime.now(timezone.utc).isoformat(), **summary}, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary
