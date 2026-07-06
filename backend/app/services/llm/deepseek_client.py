"""中文说明：DeepSeek OpenAI-compatible Chat Completions 客户端。"""

from __future__ import annotations

import json
from collections.abc import Iterator

import httpx


class AiClientError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def chat_completion(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int | None = None,
    response_format: dict[str, str] | None = None,
    thinking: dict[str, str] | None = None,
) -> str:
    """中文说明：调用 DeepSeek，不记录 api_key；返回 assistant 文本。"""

    if not api_key:
        raise AiClientError("AI_CONFIG_MISSING", "请先配置 DeepSeek API Key。")
    url = base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, object] = {"model": model, "messages": messages, "stream": False}
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if response_format is not None:
        payload["response_format"] = response_format
    if thinking is not None:
        payload["thinking"] = thinking
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=60,
        )
    except httpx.RequestError as exc:
        raise AiClientError("AI_NETWORK_ERROR", "连接 DeepSeek 失败，请检查网络或 Base URL。") from exc
    if response.status_code in {401, 403}:
        raise AiClientError("AI_AUTH_FAILED", "DeepSeek API Key 无效或权限不足。")
    if response.status_code == 404:
        raise AiClientError("AI_MODEL_NOT_FOUND", "当前模型不可用，请更换模型。")
    if response.status_code == 429:
        raise AiClientError("AI_RATE_LIMITED", "请求过于频繁，请稍后再试。")
    if response.status_code >= 400:
        raise AiClientError("AI_NETWORK_ERROR", "DeepSeek 返回错误，请检查配置后重试。")
    data = response.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    if not content:
        raise AiClientError("AI_EMPTY_RESPONSE", "模型没有返回有效内容，请重试。")
    return str(content)


def stream_chat_completion(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    max_tokens: int | None = None,
    thinking: dict[str, str] | None = None,
) -> Iterator[str]:
    """中文说明：流式调用 DeepSeek，逐段返回 assistant 文本。"""

    if not api_key:
        raise AiClientError("AI_CONFIG_MISSING", "请先配置 DeepSeek API Key。")
    url = base_url.rstrip("/") + "/chat/completions"
    payload: dict[str, object] = {"model": model, "messages": messages, "stream": True}
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if thinking is not None:
        payload["thinking"] = thinking
    try:
        with httpx.stream(
            "POST",
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=60,
        ) as response:
            if response.status_code in {401, 403}:
                raise AiClientError("AI_AUTH_FAILED", "DeepSeek API Key 无效或权限不足。")
            if response.status_code == 404:
                raise AiClientError("AI_MODEL_NOT_FOUND", "当前模型不可用，请更换模型。")
            if response.status_code == 429:
                raise AiClientError("AI_RATE_LIMITED", "请求过于频繁，请稍后再试。")
            if response.status_code >= 400:
                raise AiClientError("AI_NETWORK_ERROR", "DeepSeek 返回错误，请检查配置后重试。")
            for line in response.iter_lines():
                if not line:
                    continue
                if line.startswith("data:"):
                    line = line[5:].strip()
                if line == "[DONE]":
                    break
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                choices = data.get("choices") or []
                if not choices:
                    continue
                content = choices[0].get("delta", {}).get("content")
                if content:
                    yield str(content)
    except httpx.RequestError as exc:
        raise AiClientError("AI_NETWORK_ERROR", "连接 DeepSeek 失败，请检查网络或 Base URL。") from exc
