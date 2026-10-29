from contextlib import closing
import json
import sqlite3

import pytest
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient

from app.middleware.desktop_auth import DesktopTokenMiddleware
from app.services.library_transfer import DATABASE_NAME, copy_library, inspect_library


@pytest.fixture
def library(tmp_path):
    root = tmp_path / "原始资料库"
    root.mkdir()
    with closing(sqlite3.connect(root / DATABASE_NAME)) as db:
        db.executescript("""CREATE TABLE questions (id TEXT PRIMARY KEY);
            INSERT INTO questions VALUES ('q1');
            CREATE TABLE studio_conversations (id TEXT PRIMARY KEY);
            INSERT INTO studio_conversations VALUES ('c1');
            CREATE TABLE media_assets (id TEXT PRIMARY KEY, mime_type TEXT);
            INSERT INTO media_assets VALUES ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'image/png');""")
    (root / "media").mkdir()
    (root / "media" / ("a" * 32 + ".png")).write_bytes(b"fixture-image")
    (root / ".env").write_text("SECRET=never-export")
    (root / "media/private.txt").write_text("not-an-image")
    return root


def test_backup_is_consistent_with_live_wal_and_copies_only_library(library, tmp_path):
    with closing(sqlite3.connect(library / DATABASE_NAME)) as writer:
        writer.execute("PRAGMA journal_mode=WAL")
        writer.execute("INSERT INTO questions VALUES ('q2')")
        writer.commit()
        writer.execute("INSERT INTO questions VALUES ('uncommitted')")
        result = copy_library(library, tmp_path / "backup")
        assert result == {"questions": 2, "conversations": 1, "images": 1}
        writer.rollback()
    backup = tmp_path / "backup"
    assert inspect_library(backup) == result
    assert not (backup / ".env").exists()
    assert not (backup / "media/private.txt").exists()
    assert (backup / "media" / ("a" * 32 + ".png")).read_bytes() == b"fixture-image"
    assert json.loads((backup / "xiaojing-backup.json").read_text())["format"] == 1
    assert inspect_library(library)["questions"] == 2


@pytest.mark.parametrize("target", ["same", "inside", "existing"])
def test_backup_never_overwrites_existing_or_source(library, tmp_path, target):
    destination = {"same": library, "inside": library / "backup", "existing": tmp_path}[target]
    with pytest.raises(ValueError, match="全新目录"):
        copy_library(library, destination)
    assert inspect_library(library)["questions"] == 1


def test_missing_image_rejected_before_copy(library, tmp_path):
    (library / "media" / ("a" * 32 + ".png")).unlink()
    with pytest.raises(ValueError, match="缺少图片"):
        copy_library(library, tmp_path / "backup")
    assert not (tmp_path / "backup").exists()


def test_foreign_database_is_not_imported(tmp_path):
    with closing(sqlite3.connect(tmp_path / DATABASE_NAME)) as db:
        db.execute("CREATE TABLE unrelated (id INTEGER)")
    with pytest.raises(ValueError, match="不是小鲸"):
        inspect_library(tmp_path)


def test_desktop_token_protects_every_route_and_preserves_streaming():
    app = FastAPI()
    app.add_middleware(DesktopTokenMiddleware, token="private-test-token")

    @app.get("/events")
    async def events():
        async def generate():
            yield "data: first\n\n"
            yield "data: second\n\n"
        return StreamingResponse(generate(), media_type="text/event-stream")

    client = TestClient(app)
    for headers in [{}, {"X-Xiaojing-Token": "wrong"}]:
        assert client.get("/events", headers=headers).status_code == 401
        assert client.get("/docs", headers=headers).status_code == 401
    response = client.get("/events", headers={"X-Xiaojing-Token": "private-test-token"})
    assert response.status_code == 200
    assert response.text == "data: first\n\ndata: second\n\n"
