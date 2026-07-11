"""中文说明：AnySearch JSON-RPC 客户端，用于 AI 题目生成联网增强。"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import settings


class AnySearchError(RuntimeError):
    """中文说明：AnySearch 调用失败，外层会降级为普通生成。"""


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
    query: str = ""
    intent: str = ""


def anysearch_search(query: str, *, max_results: int = 2, intent: str = "", api_key: str | None = None, endpoint: str | None = None) -> list[SearchResult]:
    """中文说明：执行通用搜索，返回规整后的搜索结果。"""

    text = _call_anysearch("search", {"query": query, "max_results": max(1, min(max_results, 10))}, api_key=api_key, endpoint=endpoint)
    results = _parse_search_results(text)
    for item in results:
        item.query = query
        item.intent = intent
    return results[:max_results]


def anysearch_extract(url: str, *, api_key: str | None = None, endpoint: str | None = None) -> str:
    """中文说明：提取网页正文 Markdown。"""

    return _call_anysearch("extract", {"url": url}, api_key=api_key, endpoint=endpoint)


def _call_anysearch(tool_name: str, arguments: dict[str, Any], *, api_key: str | None = None, endpoint: str | None = None) -> str:
    if not settings.anysearch_enabled:
        raise AnySearchError("AnySearch is disabled")
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }
    headers = {"Content-Type": "application/json"}
    resolved_api_key = api_key or settings.anysearch_api_key
    resolved_endpoint = endpoint or settings.anysearch_endpoint
    if resolved_api_key:
        headers["Authorization"] = f"Bearer {resolved_api_key}"
    try:
        response = httpx.post(resolved_endpoint, headers=headers, json=payload, timeout=35)
    except httpx.RequestError as exc:
        raise AnySearchError("AnySearch network error") from exc
    if response.status_code >= 400:
        raise AnySearchError(f"AnySearch HTTP error: {response.status_code}")
    try:
        data = response.json()
    except json.JSONDecodeError as exc:
        raise AnySearchError("AnySearch returned non JSON response") from exc
    if data.get("error"):
        message = data.get("error", {}).get("message") or str(data["error"])
        raise AnySearchError(message)
    result = data.get("result") or {}
    content = result.get("content")
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                return str(item.get("text") or "")
    return json.dumps(result, ensure_ascii=False)


def _parse_search_results(raw: str) -> list[SearchResult]:
    raw = raw.strip()
    if not raw:
        return []
    parsed = _try_parse_json(raw)
    if parsed is not None:
        rows = _collect_result_objects(parsed)
        if rows:
            return _dedupe_results(rows)
    return _dedupe_results(_parse_markdown_results(raw))


def _try_parse_json(raw: str) -> Any | None:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                return None
    return None


def _collect_result_objects(value: Any) -> list[SearchResult]:
    rows: list[SearchResult] = []
    if isinstance(value, dict):
        url = _first_text(value, ("url", "link", "href"))
        if url and url.startswith(("http://", "https://")):
            rows.append(
                SearchResult(
                    title=_first_text(value, ("title", "name")) or url,
                    url=url,
                    snippet=_first_text(value, ("snippet", "summary", "description", "content")) or "",
                )
            )
        for item in value.values():
            rows.extend(_collect_result_objects(item))
    elif isinstance(value, list):
        for item in value:
            rows.extend(_collect_result_objects(item))
    return rows


def _first_text(row: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        value = row.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _parse_markdown_results(raw: str) -> list[SearchResult]:
    rows: list[SearchResult] = []
    markdown_links = re.findall(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", raw)
    for title, url in markdown_links:
        rows.append(SearchResult(title=_clean_inline(title), url=_clean_url(url), snippet=_snippet_near(raw, url)))
    known_urls = {item.url for item in rows}
    for url in re.findall(r"https?://[^\s)>\]\"']+", raw):
        cleaned = _clean_url(url)
        if cleaned not in known_urls:
            rows.append(SearchResult(title=cleaned, url=cleaned, snippet=_snippet_near(raw, cleaned)))
            known_urls.add(cleaned)
    return rows


def _snippet_near(raw: str, url: str) -> str:
    index = raw.find(url)
    if index < 0:
        return ""
    start = max(0, raw.rfind("\n", 0, index - 1))
    end = raw.find("\n\n", index)
    if end < 0:
        end = min(len(raw), index + 500)
    return _clean_inline(raw[start:end])[:500]


def _clean_inline(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _clean_url(url: str) -> str:
    return url.rstrip(".,，。；;")


def _dedupe_results(rows: list[SearchResult]) -> list[SearchResult]:
    result: list[SearchResult] = []
    seen: set[str] = set()
    for row in rows:
        if not row.url or row.url in seen:
            continue
        seen.add(row.url)
        result.append(row)
    return result
