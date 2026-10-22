"""Synthetic geometry/function images only; never call a real model or user database."""

import base64
from io import BytesIO
import json

from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.ai_tutor import AiTutorMessage
from app.models.media_asset import MediaAsset
from app.schemas.ai import AiConfig
from app.schemas.question import QuestionUpdate
from app.services.llm import ai_grading_service, ai_tutor_service, vision_context
from app.services.llm.deepseek_client import AiClientError
from app.services.media_service import MAX_IMAGE_BYTES, MediaError, decode_image, markdown_images, question_images, store_image
from app.services.question_revision_service import update_question


@pytest.fixture
def image_env(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "data_dir", tmp_path)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.pop(get_db, None)
    db.close()
    engine.dispose()


def synthetic_image(kind="geometry", format="PNG", size=(240, 180)):
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    if kind == "geometry":
        draw.polygon([(30, 150), (210, 150), (30, 30)], outline="black", width=3)
        draw.text((35, 130), "90", fill="black")
    else:
        draw.line([(20, 150), (220, 150)], fill="black", width=2)
        draw.line([(30, 170), (30, 20)], fill="black", width=2)
        draw.line([(30, 150), (180, 30)], fill="blue", width=3)
    output = BytesIO()
    image.save(output, format=format)
    return output.getvalue()


def upload(client, kind="geometry", format="PNG"):
    data = synthetic_image(kind, format)
    response = client.post("/api/media/images", files={"file": ("ignored-name.bin", data, "application/octet-stream")})
    assert response.status_code == 201, response.text
    return response.json(), data


def create(client, image_url, subjective=False, explanation_url=None):
    payload = {"type": "short_answer" if subjective else "single_choice", "stem": f"观察图形，说明性质。\n![题图]({image_url})",
               "standard_answer": "直角三角形" if subjective else "A", "explanation": "根据图中标注回答。",
               "scoring_standard": "根据图中标注说明理由。" if subjective else None}
    if not subjective:
        payload["options"] = [{"key": "A", "text": "正确"}, {"key": "B", "text": "错误"}]
    if explanation_url:
        payload["explanation"] += f"\n![解析图]({explanation_url})"
    response = client.post("/api/questions", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def image_urls(messages):
    return [part["image_url"]["url"] for message in messages if isinstance(message["content"], list)
            for part in message["content"] if part["type"] == "image_url"]


def grading_json():
    return json.dumps({"score": 8, "max_score": 10, "level": "良好", "summary": "说明了直角性质。",
                       "dimension_scores": [], "matched_points": ["直角"], "missing_points": [],
                       "wrong_or_unclear_points": [], "improvement_suggestion": "补充依据。", "better_answer": "依据90度标注。"})


def test_representative_geometry_upload_tutor_and_grading(image_env, monkeypatch):
    client, db = image_env
    asset, data = upload(client)
    question = create(client, asset["url"], subjective=True)
    capture = []
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kw: capture.append(kw) or "观察角度标注。")
    response = client.post("/api/ai/thread/action", json={"question_id": question["id"], "action": "hint", "api_key": "test-only"})
    assert response.json()["ok"]
    assert response.json()["thread"]["model"] == "deepseek-flash"
    assert response.json()["thread"]["image_count"] == 1
    restored = client.get("/api/ai/thread", params={"question_id": question["id"]}).json()
    assert restored["model"] == "deepseek-flash"
    assert restored["image_count"] == 1
    assert image_urls(capture[0]["messages"]) == ["data:image/png;base64," + base64.b64encode(data).decode()]
    submit = client.post(f"/api/questions/{question['id']}/submit", json={"answer": "有90度角，因此是直角三角形。"}).json()
    monkeypatch.setattr(ai_grading_service, "chat_completion", lambda **kw: capture.append(kw) or grading_json())
    grade = client.post("/api/ai/grading/grade", json={"question_id": question["id"], "attempt_id": submit["attempt_id"], "api_key": "test-only"})
    assert grade.status_code == 200, grade.text
    assert grade.json()["model"] == "deepseek-flash"
    assert grade.json()["image_count"] == 1
    assert len(image_urls(capture[-1]["messages"])) == 1
    assert client.get(asset["url"]).content == data


def test_representative_function_choice_keeps_answer_image_hidden(image_env, monkeypatch):
    client, db = image_env
    asset, _ = upload(client, "function")
    answer_asset, answer_data = upload(client, "geometry")
    question = create(client, asset["url"], explanation_url=answer_asset["url"])
    capture = []
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kw: capture.append(kw) or "先观察坐标轴。")
    response = client.post("/api/ai/thread/action", json={"question_id": question["id"], "action": "hint", "api_key": "test-only"})
    assert response.json()["ok"]
    assert len(image_urls(capture[0]["messages"])) == 1
    assert "data:image/png;base64," + base64.b64encode(answer_data).decode() not in image_urls(capture[0]["messages"])
    assert "解析图" not in str(capture[0]["messages"])


@pytest.mark.parametrize("format,mime", [("PNG", "image/png"), ("JPEG", "image/jpeg"), ("WEBP", "image/webp")])
def test_actual_format_not_filename_or_declared_mime(image_env, format, mime):
    client, db = image_env
    asset, data = upload(client, format=format)
    assert asset["mime_type"] == mime
    assert (asset["width"], asset["height"]) == (240, 180)
    response = client.get(asset["url"])
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-type"] == mime
    assert response.content == data
    assert db.get(MediaAsset, asset["id"]).sha256


@pytest.mark.parametrize("data,code", [(b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "INVALID_IMAGE"),
                                        (b"not an image", "INVALID_IMAGE"),
                                        (synthetic_image(format="GIF"), "UNSUPPORTED_IMAGE_TYPE"),
                                        (b"x" * (MAX_IMAGE_BYTES + 1), "MEDIA_TOO_LARGE")])
def test_bad_uploads_return_actionable_errors(image_env, data, code):
    client, db = image_env
    response = client.post("/api/media/images", files={"file": ("image.png", data, "image/png")})
    assert response.status_code in {413, 415}
    assert response.json()["detail"]["code"] == code
    assert db.query(MediaAsset).count() == 0


def test_multipart_body_bounded_before_file_spooling(image_env):
    client, db = image_env
    response = client.post("/api/media/images", content=b"x" * (MAX_IMAGE_BYTES + 65537), headers={"Content-Type": "multipart/form-data; boundary=test"})
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "MEDIA_TOO_LARGE"


@pytest.mark.parametrize("size", [(8193, 1), (4001, 4000)])
def test_dimensions_are_checked_before_pixel_decode(size):
    with pytest.raises(MediaError) as exc:
        decode_image(synthetic_image(size=size))
    assert exc.value.code == "IMAGE_DIMENSIONS_EXCEEDED"


def test_missing_asset_and_traversal_are_not_filesystem_reads(image_env):
    client, db = image_env
    response = client.get("/api/media/images/" + "0" * 32)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "MEDIA_NOT_FOUND"
    assert client.get("/api/media/images/not-a-uuid").status_code == 404


def test_markdown_reference_images_detected_but_code_ignored(image_env):
    client, db = image_env
    asset, _ = upload(client)
    source = f"![说明][geometry]\n\n[geometry]: {asset['url']}\n\n`![bad](https://bad.test/a.png)`\n\n```md\n![bad](file:///a)\n```"
    assert list(markdown_images(source)) == [(asset["url"], "说明")]
    assert len(question_images(db, {"stem": source})) == 1


@pytest.mark.parametrize("url", ["https://example.com/a.png", "//example.com/a.png", "file:///etc/passwd", "data:image/png;base64,YQ==", "/api/media/images/../../a", "/images/figure.png"])
def test_unmanaged_image_references_rejected(image_env, url):
    client, db = image_env
    response = client.post("/api/questions", json={"type": "short_answer", "stem": f"![图]({url})", "standard_answer": "答", "scoring_standard": "标准"})
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_IMAGE_REFERENCE"


def test_question_image_count_total_bytes_and_dedup(image_env):
    client, db = image_env
    assets = [upload(client)[0] for _ in range(7)]
    refs = [f"![图]({asset['url']})" for asset in assets]
    assert len(question_images(db, {"stem": refs[0] * 7})) == 1
    with pytest.raises(MediaError) as exc:
        question_images(db, {"stem": "\n".join(refs)})
    assert exc.value.code == "TOO_MANY_IMAGES"
    for asset in assets[:5]:
        db.get(MediaAsset, asset["id"]).size_bytes = MAX_IMAGE_BYTES
    with pytest.raises(MediaError) as exc:
        question_images(db, {"stem": "\n".join(refs[:5])})
    assert exc.value.code == "QUESTION_IMAGES_TOO_LARGE"


def test_edit_revision_restore_and_soft_delete_preserve_images(image_env):
    client, db = image_env
    first, first_data = upload(client)
    second, _ = upload(client, "function")
    question = create(client, first["url"])
    updated = client.patch(f"/api/questions/{question['id']}", json={"stem": f"新图 ![新图]({second['url']})"})
    assert updated.status_code == 200
    revisions = client.get(f"/api/questions/{question['id']}/revisions").json()
    revision_id = revisions[0]["id"]
    restored = client.post(f"/api/questions/{question['id']}/revisions/{revision_id}/restore", json={"restore_target": "before"})
    assert restored.status_code == 200
    assert first["url"] in restored.json()["stem"]
    assert client.request("DELETE", f"/api/questions/{question['id']}", json={"reason": "合成测试"}).status_code == 200
    assert client.get(first["url"]).content == first_data
    assert client.post(f"/api/questions/{question['id']}/restore", json={}).status_code == 200
    assert client.get(second["url"]).status_code == 200


def test_vision_model_rejection_never_calls_text_model(image_env, monkeypatch):
    client, db = image_env
    asset, _ = upload(client)
    question = create(client, asset["url"])
    def forbidden(**kwargs):
        raise AssertionError("Unsupported vision must not call a text model")
    monkeypatch.setattr(ai_tutor_service, "chat_completion", forbidden)
    response = client.post("/api/ai/thread/action", json={"question_id": question["id"], "action": "hint", "api_key": "test-only", "vision_model": "deepseek-v4-pro"})
    assert not response.json()["ok"]
    assert response.json()["error_code"] == "AI_VISION_UNSUPPORTED"
    stream = client.post("/api/ai/thread/action-stream", json={"question_id": question["id"], "action": "hint", "api_key": "test-only", "vision_model": "deepseek-v4-pro"})
    assert "AI_VISION_UNSUPPORTED" in stream.text
    assert '"type": "done"' not in stream.text


@pytest.mark.parametrize("modalities", [None, "image", []])
def test_unknown_model_capability_is_not_assumed(monkeypatch, modalities):
    class Response:
        def raise_for_status(self):
            pass
        def json(self):
            return {"data": [{"id": "custom-model", "input_modalities": modalities}]}
    monkeypatch.setattr(vision_context.httpx, "get", lambda *args, **kwargs: Response())
    with pytest.raises(AiClientError) as exc:
        vision_context.ensure_vision_model(AiConfig(api_key="test-only", base_url="https://custom.example/v1"), "custom-model")
    assert exc.value.code == ("AI_VISION_UNSUPPORTED" if modalities == [] else "AI_VISION_UNVERIFIED")


def test_missing_or_corrupt_image_fails_before_model(image_env, monkeypatch):
    client, db = image_env
    asset, _ = upload(client)
    question = create(client, asset["url"])
    path = settings.data_dir / "media" / f"{asset['id']}.png"
    path.write_bytes(b"corrupt")
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: pytest.fail("must not call model"))
    response = client.post("/api/ai/thread/action", json={"question_id": question["id"], "action": "hint", "api_key": "test-only"})
    assert response.json()["error_code"] == "AI_IMAGE_UNAVAILABLE"
    assert client.get(asset["url"]).json()["detail"]["code"] == "INVALID_IMAGE"


def test_stream_fallback_preserves_images_and_persists_only_text(image_env, monkeypatch):
    client, db = image_env
    asset, _ = upload(client)
    question = create(client, asset["url"])
    captured = []
    def interrupted(**kwargs):
        captured.append(kwargs)
        raise AiClientError("AI_NETWORK_ERROR", "synthetic stream interruption")
        yield "unreachable"
    monkeypatch.setattr(ai_tutor_service, "stream_chat_completion", interrupted)
    monkeypatch.setattr(ai_tutor_service, "chat_completion", lambda **kwargs: captured.append(kwargs) or "观察坐标轴。")
    response = client.post("/api/ai/thread/action-stream", json={"question_id": question["id"], "action": "hint", "api_key": "test-only"})
    assert '"type": "done"' in response.text
    assert '"image_count": 1' in response.text
    assert len(captured) == 2
    assert captured[0]["model"] == captured[1]["model"] == "deepseek-flash"
    assert image_urls(captured[0]["messages"]) == image_urls(captured[1]["messages"])
    assert all("data:image/" not in item.content for item in db.query(AiTutorMessage).all())


def test_grading_retry_and_both_followups_keep_snapshot_images(image_env, monkeypatch):
    client, db = image_env
    old_asset, _ = upload(client)
    new_asset, _ = upload(client, "function")
    question = create(client, old_asset["url"], subjective=True)
    attempt = client.post(f"/api/questions/{question['id']}/submit", json={"answer": "这是直角三角形。"}).json()
    assert client.patch(f"/api/questions/{question['id']}", json={"stem": f"新题干 ![图]({new_asset['url']})"}).status_code == 200
    captured = []
    replies = iter(["not json", grading_json()])
    monkeypatch.setattr(ai_grading_service, "chat_completion", lambda **kwargs: captured.append(kwargs) or next(replies))
    response = client.post("/api/ai/grading/grade", json={"question_id": question["id"], "attempt_id": attempt["attempt_id"], "api_key": "test-only"})
    assert response.status_code == 200, response.text
    assert len(captured) == 2
    assert image_urls(captured[0]["messages"]) == image_urls(captured[1]["messages"])
    assert old_asset["url"] in str(captured[0]["messages"])
    assert new_asset["url"] not in str(captured[0]["messages"])
    grading_id = response.json()["grading_id"]
    monkeypatch.setattr(ai_grading_service, "chat_completion", lambda **kwargs: captured.append(kwargs) or "应根据直角标注说明。")
    followup = client.post("/api/ai/grading/message", json={"grading_id": grading_id, "content": "为什么扣分？", "api_key": "test-only"})
    assert followup.status_code == 200
    assert followup.json()["chat_model"] == "deepseek-flash"
    assert followup.json()["chat_image_count"] == 1
    assert image_urls(captured[-1]["messages"]) == image_urls(captured[0]["messages"])
    def stream(**kwargs):
        captured.append(kwargs)
        yield "请说明90度标注。"
    monkeypatch.setattr(ai_grading_service, "stream_chat_completion", stream)
    streamed = client.post("/api/ai/grading/message-stream", json={"grading_id": grading_id, "content": "如何改进？", "api_key": "test-only"})
    assert '"type": "done"' in streamed.text
    assert image_urls(captured[-1]["messages"]) == image_urls(captured[0]["messages"])


def test_import_preview_reports_missing_reference_and_commit_is_atomic(image_env):
    client, db = image_env
    from app.models.question import Question
    asset, _ = upload(client)
    source = """<!-- question-bank-format: v2 -->
--- question ---
question_id: q_image_import
type: single_choice
difficulty: 2
stem: |
  看图回答 ![图](IMAGE_URL)
options:
  A: 正确
  B: 错误
answer: A
""".replace("IMAGE_URL", asset["url"])
    preview = client.post("/api/imports/preview", json={"text": source}).json()
    assert preview["blocking_error_count"] == 0
    missing = source.replace(asset["id"], "0" * 32)
    preview = client.post("/api/imports/preview", json={"text": missing}).json()
    assert preview["blocking_error_count"] == 1
    assert preview["errors"][0]["field"] == "stem"
    assert client.post("/api/imports/commit", json={"text": missing}).status_code == 400
    assert db.query(Question).count() == 0
    assert client.post("/api/imports/commit", json={"text": source}).status_code == 200


def test_image_metadata_migration_preserves_existing_rows(monkeypatch):
    from app import database
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE ai_tutor_threads (id TEXT PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE ai_grading_results (id INTEGER PRIMARY KEY)"))
        connection.execute(text("INSERT INTO ai_tutor_threads (id) VALUES ('legacy')"))
    monkeypatch.setattr(database, "engine", engine)
    for name in ("backfill_question_order_and_directions", "backfill_user_question_states", "backfill_question_sources", "backfill_question_collections"):
        monkeypatch.setattr(database, name, lambda: None)
    database.run_lightweight_migrations()
    database.run_lightweight_migrations()
    with engine.connect() as connection:
        row = connection.execute(text("SELECT id, model, image_count FROM ai_tutor_threads")).one()
        assert tuple(row) == ("legacy", None, 0)
    assert {"image_count", "chat_model", "chat_image_count"} <= {column["name"] for column in inspect(engine).get_columns("ai_grading_results")}


def test_image_question_generation_explicitly_rejected_before_model(image_env, monkeypatch):
    from app.services.llm import ai_question_generation_service
    client, db = image_env
    asset, _ = upload(client)
    question = create(client, asset["url"])
    monkeypatch.setattr(ai_question_generation_service, "chat_completion", lambda **kwargs: pytest.fail("must not generate without image support"))
    response = client.post("/api/ai/question-generation/generate", json={"question_id": question["id"], "target_type": "short_answer", "api_key": "test-only"})
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "AI_IMAGE_GENERATION_UNSUPPORTED"
    assert "图片讲题、评分和追问仍可正常使用" in response.json()["detail"]["message"]
