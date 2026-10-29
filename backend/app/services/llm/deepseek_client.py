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


def _check_status(response: httpx.Response, messages: list[dict[str, object]]) -> None:
    errors = {
        401: ("AI_AUTH_FAILED", "DeepSeek API Key 无效或权限不足。"),
        403: ("AI_AUTH_FAILED", "DeepSeek API Key 无效或权限不足。"),
        404: ("AI_MODEL_NOT_FOUND", "当前模型不可用，请更换模型。"),
        429: ("AI_RATE_LIMITED", "请求过于频繁，请稍后再试。"),
    }
    if response.status_code in errors:
        raise AiClientError(*errors[response.status_code])
    if response.status_code >= 400:
        has_images = any(isinstance(item.get("content"), list) for item in messages)
        raise AiClientError("AI_VISION_REQUEST_FAILED" if has_images else "AI_NETWORK_ERROR",
                            "模型请求失败；若题目含图，请检查图片模型是否支持图片输入后重试。")


def chat_completion(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, object]],
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
    _check_status(response, messages)
    try:
        data = response.json()
        choice = (data.get("choices") or [{}])[0]
        content = choice.get("message", {}).get("content")
    except (ValueError, AttributeError, TypeError, IndexError) as exc:
        raise AiClientError("AI_BAD_RESPONSE", "模型返回的响应格式异常，请重试。") from exc
    if choice.get("finish_reason") == "length":
        raise AiClientError("AI_RESPONSE_TRUNCATED", "模型输出达到长度上限，请缩小问题范围后重试。")
    if not content:
        raise AiClientError("AI_EMPTY_RESPONSE", "模型没有返回有效内容，请重试。")
    return str(content)


def stream_chat_completion(
    *,
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, object]],
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
            _check_status(response, messages)
            finished = False
            for line in response.iter_lines():
                if not line:
                    continue
                if line.startswith("data:"):
                    line = line[5:].strip()
                if line == "[DONE]":
                    finished = True
                    break
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                choices = data.get("choices") or []
                if data.get("error"):
                    raise AiClientError("AI_STREAM_INTERRUPTED", "模型流式响应报错，请重试。")
                if not choices:
                    continue
                content = choices[0].get("delta", {}).get("content")
                if choices[0].get("finish_reason") == "length":
                    raise AiClientError("AI_RESPONSE_TRUNCATED", "模型输出达到长度上限，请缩小问题范围后重试。")
                if choices[0].get("finish_reason") == "stop":
                    finished = True
                if content:
                    yield str(content)
            if not finished:
                raise AiClientError("AI_STREAM_INTERRUPTED", "AI 流式响应意外结束，请重试。")
    except httpx.RequestError as exc:
        raise AiClientError("AI_NETWORK_ERROR", "连接 DeepSeek 失败，请检查网络或 Base URL。") from exc
