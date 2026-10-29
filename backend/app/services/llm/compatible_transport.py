"""Cancellable Chat Completions transport for explicitly configured connections."""

from collections.abc import AsyncIterator
import json

import httpx

from app.schemas.studio import ModelConnection


class ConnectionError(ValueError):
    pass


async def stream_reply(connection: ModelConnection, messages: list[dict], max_tokens: int = 8192) -> AsyncIterator[str]:
    headers = {"Accept": "text/event-stream", "Content-Type": "application/json"}
    if connection.api_key:
        headers["Authorization"] = f"Bearer {connection.api_key}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10), follow_redirects=False) as client:
            async with client.stream("POST", f"{connection.base_url}/chat/completions", headers=headers,
                                     json={"model": connection.model, "messages": messages, "stream": True, "max_tokens": max_tokens}) as response:
                if response.status_code != 200:
                    messages_by_status = {
                        400: "模型拒绝了请求。请核对模型名称、图片能力与 Chat Completions 支持情况。",
                        401: "API Key 无效或已过期，请在模型连接中更新。",
                        403: "该 API Key 无权访问所选模型。",
                        404: "未找到接口或模型，请核对基础地址及模型名称。",
                        413: "模型服务拒绝了过大的请求，请减少图片或开启新讨论。",
                        429: "模型服务限流或额度不足，请稍后重试或检查账户额度。",
                    }
                    raise ConnectionError(messages_by_status.get(response.status_code, f"模型服务返回 HTTP {response.status_code}，请稍后重试。"))
                finished = False
                has_content = False
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data:
                        continue
                    if data == "[DONE]":
                        finished = True
                        break
                    try:
                        event = json.loads(data)
                    except json.JSONDecodeError as exc:
                        raise ConnectionError("模型返回了无法读取的数据，请检查接口协议。") from exc
                    if not isinstance(event, dict) or event.get("error"):
                        raise ConnectionError("模型服务中断了回复，请稍后重试。")
                    choices = event.get("choices") or []
                    if not choices:
                        continue
                    if not isinstance(choices, list) or not isinstance(choices[0], dict):
                        raise ConnectionError("模型回复格式不符合 Chat Completions 协议。")
                    choice = choices[0]
                    delta = choice.get("delta") or {}
                    if not isinstance(delta, dict):
                        raise ConnectionError("模型回复格式不符合 Chat Completions 协议。")
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        has_content = True
                        yield content
                    reason = choice.get("finish_reason")
                    if reason == "length":
                        raise ConnectionError("回复达到模型长度限制。已保留收到的内容，请缩小问题范围后继续。")
                    if reason and reason != "stop":
                        raise ConnectionError("模型未正常完成回复，已保留收到的内容。")
                    if reason == "stop":
                        finished = True
                if not finished:
                    raise ConnectionError("连接提前结束，已保留部分回复，可以重试。")
                if not has_content:
                    raise ConnectionError("模型没有返回正文，请更换模型或重试。")
    except httpx.TimeoutException as exc:
        raise ConnectionError("模型响应超时，请稍后重试。") from exc
    except httpx.HTTPError as exc:
        raise ConnectionError("无法连接模型服务，请检查地址和网络。") from exc
