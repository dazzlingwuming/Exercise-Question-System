import asyncio
from datetime import timedelta
from io import BytesIO

import httpx
from PIL import Image
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.studio import StudioConversation, StudioMessage, utc_now
from app.routers import studio
from app.schemas.studio import MathRequest, ModelConnection, StudioSend
from app.services import media_service
from app.services.llm import compatible_transport
from app.services.math_tools import MathInputError, calculate
from app.services.studio_service import finish_run, get_conversation, history, prepare_run


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)


def make_conversation(db):
    row = StudioConversation(id="a" * 32, mode="learn")
    db.add(row); db.commit()
    return row


def test_desktop_restart_recovers_interrupted_run_without_discarding_content(db):
    from app.services.desktop_lifecycle import recover_interrupted_runs
    conversation = make_conversation(db)
    conversation.active_run_id = "old-run"
    conversation.run_started_at = utc_now()
    db.add(StudioMessage(id="m", conversation_id=conversation.id, role="assistant", status="pending", content="已保存的部分回复"))
    db.add(StudioMessage(id="complete", conversation_id=conversation.id, role="assistant", status="complete", content="完整回答"))
    db.commit()
    recover_interrupted_runs(db)
    db.expire_all()
    assert db.get(StudioMessage, "m").status == "stopped"
    assert db.get(StudioMessage, "m").content == "已保存的部分回复"
    assert db.get(StudioMessage, "complete").status == "complete"
    assert db.get(StudioConversation, conversation.id).active_run_id is None


def send_payload(**kwargs):
    return StudioSend(connection=ModelConnection(api_key="secret-test", supports_images=True), **kwargs)


def test_stream_persists_turn_and_retry_does_not_duplicate_question(client, db, monkeypatch):
    captured = []
    async def fake_stream(connection, messages, **kwargs):
        captured.append(messages)
        yield "先算 "
        raise compatible_transport.ConnectionError("连接提前结束")
    monkeypatch.setattr(studio, "stream_reply", fake_stream)
    cid = client.post("/api/studio/conversations", json={"mode": "explain"}).json()["id"]
    result = client.post(f"/api/studio/conversations/{cid}/messages", json={"connection": {"api_key": "secret-test"}, "content": "2+2?"})
    assert "event: error" in result.text
    detail = client.get(f"/api/studio/conversations/{cid}").json()
    assert len(detail["messages"]) == 2
    assert detail["messages"][1]["content"] == "先算 "
    assert detail["messages"][1]["status"] == "error"
    assert not detail["busy"]
    assert "secret-test" not in str(detail)
    status = client.get(f"/api/studio/conversations/{cid}/status").json()
    assert not status["busy"] and "messages" not in status
    async def success(*args, **kwargs):
        yield "4"
    monkeypatch.setattr(studio, "stream_reply", success)
    retry = client.post(f"/api/studio/conversations/{cid}/messages", json={"connection": {}, "retry_message_id": detail["messages"][1]["id"]})
    assert "event: done" in retry.text
    detail = client.get(f"/api/studio/conversations/{cid}").json()
    assert len(detail["messages"]) == 2
    assert detail["messages"][1]["content"] == "4"
    assert detail["messages"][1]["status"] == "complete"
    assert captured[0][-1] == {"role": "user", "content": "2+2?"}
    draft = client.get(f'/api/studio/messages/{detail["messages"][1]["id"]}/question-draft').json()
    assert draft["stem"] == "2+2?" and draft["standard_answer"] == "4"


def test_invalid_turn_never_claims_or_writes_history(client, db):
    row = make_conversation(db)
    response = client.post(f"/api/studio/conversations/{row.id}/messages", json={"connection": {}, "content": ""})
    assert response.status_code == 422
    assert not history(db, row.id)
    response = client.post(f"/api/studio/conversations/{row.id}/messages", json={"connection": {"supports_images": True}, "image_ids": ["../secret"]})
    assert response.status_code == 404
    assert not history(db, row.id)
    assert not get_conversation(db, row.id).active_run_id


def test_images_remain_in_followup_context_and_draft(client, db, monkeypatch, tmp_path):
    monkeypatch.setattr(media_service, "media_root", lambda: tmp_path)
    raw = BytesIO(); Image.new("RGB", (8, 8), "white").save(raw, "PNG")
    image = media_service.store_image(db, raw.getvalue())
    row = make_conversation(db)
    first = prepare_run(db, row.id, send_payload(content="分析图片", image_ids=[image.id]))
    assert first[2][-1]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
    finish_run(db.get_bind(), row.id, first[0], first[1], "图中有一个方形", "complete", None)
    db.expire_all()
    second = prepare_run(db, row.id, send_payload(content="为什么？"))
    assert second[3]["image_count"] == 1
    assert second[2][1]["content"][1]["type"] == "image_url"
    assert second[2][-1]["content"] == "为什么？"
    draft = client.get(f"/api/studio/messages/{first[1]}/question-draft").json()
    assert image.id in draft["stem"]
    finish_run(db.get_bind(), row.id, second[0], second[1], "", "stopped", "已停止")
    db.expire_all()
    with pytest.raises(HTTPException, match="图片"):
        prepare_run(db, row.id, StudioSend(connection=ModelConnection(), content="继续"))
    assert len(history(db, row.id)) == 4


def test_concurrent_generation_and_expired_lease(db):
    row = make_conversation(db)
    run = prepare_run(db, row.id, send_payload(content="问题"))
    with Session(db.get_bind()) as other:
        with pytest.raises(HTTPException) as exc:
            prepare_run(other, row.id, send_payload(content="重复"))
        assert exc.value.status_code == 409
    assert len(history(db, row.id)) == 2
    row.run_started_at = utc_now() - timedelta(seconds=300); db.commit()
    recovered = get_conversation(db, row.id)
    assert not recovered.active_run_id
    assert history(db, row.id)[-1].status == "stopped"
    replacement = prepare_run(db, row.id, send_payload(retry_message_id=run[1]))
    finish_run(db.get_bind(), row.id, run[0], run[1], "old writer", "complete", None)
    db.expire_all()
    assert db.get(StudioMessage, run[1]).status == "pending"
    assert get_conversation(db, row.id).active_run_id == replacement[0]


def test_stream_cancellation_saves_partial_and_releases_run(db, monkeypatch):
    row = make_conversation(db)
    async def fake(*args, **kwargs):
        yield "已经收到的内容"
        await asyncio.sleep(60)
    monkeypatch.setattr(studio, "stream_reply", fake)
    async def scenario():
        response = await studio.send_message(row.id, send_payload(content="问题"), db)
        iterator = response.body_iterator
        assert "event: start" in await anext(iterator)
        assert "event: delta" in await anext(iterator)
        pending = asyncio.create_task(anext(iterator))
        await asyncio.sleep(0)
        pending.cancel()
        with pytest.raises(asyncio.CancelledError):
            await pending
    asyncio.run(scenario())
    db.expire_all()
    assert not get_conversation(db, row.id).active_run_id
    assert history(db, row.id)[-1].status == "stopped"
    assert history(db, row.id)[-1].content == "已经收到的内容"


def test_history_bounds_whole_turns_and_archive_restore(client, db):
    row = make_conversation(db)
    for i in range(12):
        run = prepare_run(db, row.id, send_payload(content=f"question {i}"))
        if i == 11:
            assert run[3]["history_trimmed"]
            assert len(run[2]) == 20  # System + 9 complete turns + current user.
            assert run[2][1]["content"] == "question 2"
        finish_run(db.get_bind(), row.id, run[0], run[1], f"answer {i}", "complete", None)
        db.expire_all()
    assert client.patch(f"/api/studio/conversations/{row.id}", json={"title": "代数", "pinned": True, "archived": True}).status_code == 200
    assert not client.get("/api/studio/conversations").json()["items"]
    assert client.get("/api/studio/conversations?archived=true&q=代数").json()["items"][0]["pinned"]
    assert client.post(f"/api/studio/conversations/{row.id}/messages", json={"connection": {}, "content": "继续"}).status_code == 409
    assert client.patch(f"/api/studio/conversations/{row.id}", json={"archived": False}).status_code == 200


@pytest.mark.parametrize("expression", ["__import__('os')", "().__class__", "[1]*100", "sum(x for x in [1])", "True", "x.__class__", "1 << 5", "sin(x,2)", "sqrt(x, a=1)"])
def test_math_rejects_code(expression):
    with pytest.raises(MathInputError):
        calculate(MathRequest(expression=expression, plot=True))


def test_math_values_domains_and_discontinuities():
    assert calculate(MathRequest(expression="sqrt(144)+2^3"))["value"] == 20
    assert calculate(MathRequest(expression="sin(pi/2)"))["value"] == pytest.approx(1)
    for expression in ("1/0", "sqrt(-1)", "9^99999", "1e999"):
        with pytest.raises(MathInputError): calculate(MathRequest(expression=expression))
    result = calculate(MathRequest(expression="1/x", plot=True, x_min=-1, x_max=1))
    assert len(result["points"]) == 401 and result["points"][200] == [0, None]
    with pytest.raises(MathInputError): calculate(MathRequest(expression="sin(x)", plot=True, x_min=1, x_max=0))


@pytest.mark.parametrize("url", ["file:///secret", "https://key@host", "https://host?key=secret", "https://host#secret", "https://host/chat/completions"])
def test_connection_rejects_misplaced_credentials_and_protocol(url):
    with pytest.raises(ValidationError): ModelConnection(base_url=url)


def test_transport_preserves_whitespace_and_reports_truncation(monkeypatch):
    real_client = httpx.AsyncClient
    seen = []
    def handler(request):
        seen.append(request)
        return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"a "}}]}\n\ndata: {"choices":[{"delta":{"content":" b"},"finish_reason":"length"}]}\n\n')
    monkeypatch.setattr(compatible_transport.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))
    chunks = []
    async def run():
        with pytest.raises(compatible_transport.ConnectionError, match="长度"):
            async for chunk in compatible_transport.stream_reply(ModelConnection(base_url="http://localhost:1234/v1", api_key=""), [{"role": "user", "content": "hi"}]): chunks.append(chunk)
    asyncio.run(run())
    assert "".join(chunks) == "a  b"
    assert "authorization" not in seen[0].headers


def test_message_order_is_stable_when_clock_does_not_advance(db, monkeypatch):
    from app.services import studio_service
    frozen = utc_now()
    monkeypatch.setattr(studio_service, "utc_now", lambda: frozen)
    row = make_conversation(db)
    for i in range(3):
        run = prepare_run(db, row.id, send_payload(content=f"question {i}"))
        finish_run(db.get_bind(), row.id, run[0], run[1], f"answer {i}", "complete", None)
        db.expire_all()
    rows = history(db, row.id)
    assert [item.content for item in rows] == ["question 0", "answer 0", "question 1", "answer 1", "question 2", "answer 2"]
    assert len({item.created_at for item in rows}) == 6
