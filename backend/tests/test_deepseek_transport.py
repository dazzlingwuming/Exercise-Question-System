from contextlib import contextmanager

import httpx
import pytest

from app.services.llm import deepseek_client as client


@pytest.mark.parametrize("ending,valid", [("", False), ('data: [DONE]\n\n', True), ('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n', False)], ids=["cut-off", "complete", "token-limit"])
def test_stream_requires_completion(monkeypatch, ending, valid):
    @contextmanager
    def stream(*args, **kwargs):
        yield httpx.Response(200, text='data: {"choices":[{"delta":{"content":"partial"}}]}\n\n' + ending)
    monkeypatch.setattr(client.httpx, "stream", stream)
    chunks = client.stream_chat_completion(api_key="test-only", base_url="https://example.test", model="test", messages=[])
    assert next(chunks) == "partial"
    if valid:
        assert list(chunks) == []
    else:
        with pytest.raises(client.AiClientError):
            list(chunks)


def test_bad_json_returns_actionable_error(monkeypatch):
    monkeypatch.setattr(client.httpx, "post", lambda *args, **kwargs: httpx.Response(200, text="bad json"))
    with pytest.raises(client.AiClientError, match="响应格式异常"):
        client.chat_completion(api_key="test-only", base_url="https://example.test", model="test", messages=[])
