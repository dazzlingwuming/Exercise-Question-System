"""中文说明：AI 题目生成的联网资料检索、网页片段抽取和 prompt 格式化。"""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from app.schemas.ai import AiQuestionGenerationRequest
from app.services.llm.deepseek_client import chat_completion
from app.services.search.anysearch_client import AnySearchError, SearchResult, anysearch_extract, anysearch_search


MAX_QUERIES = 4
RESULTS_PER_QUERY = 2
MAX_PAGES = 3
MAX_SNIPPETS_PER_PAGE = 2
MAX_SNIPPET_CHARS = 1000
MAX_WEB_CONTEXT_CHARS = 6000


@dataclass
class SearchQuery:
    query: str
    intent: str


@dataclass
class WebChunk:
    source: SearchResult
    heading: str
    text: str
    score: float = 0.0


def build_web_reference_context(
    *,
    payload: AiQuestionGenerationRequest,
    question_context: dict[str, Any],
    answer_context: dict[str, Any],
    grading_context: dict[str, Any],
    ai_chat_context: dict[str, Any],
    taxonomy_context: dict[str, Any],
) -> str:
    """
    中文说明：构建联网参考资料。
    失败时返回空字符串，外层继续使用普通题目生成流程。
    """

    if not payload.use_web_search:
        return ""
    try:
        queries = _generate_search_queries(
            payload=payload,
            question_context=question_context,
            answer_context=answer_context,
            grading_context=grading_context,
            ai_chat_context=ai_chat_context,
            taxonomy_context=taxonomy_context,
        )
        if not queries:
            return ""
        search_results = _search_all(queries, payload)
        selected = _select_results(search_results, question_context, ai_chat_context)
        if not selected:
            return ""
        chunks = _extract_ranked_chunks(selected, queries, question_context, ai_chat_context, payload)
        if not chunks:
            return ""
        return _format_web_context(chunks)
    except Exception:
        return ""


def _generate_search_queries(
    *,
    payload: AiQuestionGenerationRequest,
    question_context: dict[str, Any],
    answer_context: dict[str, Any],
    grading_context: dict[str, Any],
    ai_chat_context: dict[str, Any],
    taxonomy_context: dict[str, Any],
) -> list[SearchQuery]:
    raw = chat_completion(
        api_key=payload.api_key or "",
        base_url=payload.base_url or "https://api.deepseek.com",
        model=payload.model or "deepseek-v4-pro",
        messages=[
            {
                "role": "system",
                "content": (
                    "你是题库系统的联网检索规划器。你的任务不是生成题目，而是根据当前题目、"
                    "用户答案、AI 对话和评分上下文，生成 2-4 条适合联网搜索的中文或英文搜索句。"
                    "搜索句可以是关键词组合，也可以是自然语言问题。输出必须是严格 JSON。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请生成联网搜索句，帮助后续生成更高质量的技术候选题。\n\n"
                    "要求：\n"
                    "1. 输出 JSON：{\"queries\":[{\"query\":\"...\",\"intent\":\"...\"}]}\n"
                    "2. 最多 4 条，优先 2-3 条。\n"
                    "3. query 不要过泛，要围绕当前题目、用户薄弱点、工程场景或概念边界。\n"
                    "4. intent 要说明这条搜索想确认什么。\n\n"
                    "当前题目上下文：\n"
                    f"{json.dumps(question_context, ensure_ascii=False)}\n\n"
                    "用户答案上下文：\n"
                    f"{json.dumps(answer_context, ensure_ascii=False)}\n\n"
                    "AI 评分上下文：\n"
                    f"{json.dumps(grading_context, ensure_ascii=False)}\n\n"
                    "AI 对话上下文：\n"
                    f"{json.dumps(ai_chat_context, ensure_ascii=False)}\n\n"
                    "题库已有分类全集：\n"
                    f"{json.dumps(taxonomy_context, ensure_ascii=False)}"
                ),
            },
        ],
        max_tokens=800,
        response_format={"type": "json_object"},
    )
    data = _parse_json_object(raw)
    rows = data.get("queries")
    if not isinstance(rows, list):
        return []
    queries: list[SearchQuery] = []
    for row in rows[:MAX_QUERIES]:
        if not isinstance(row, dict):
            continue
        query = str(row.get("query") or "").strip()
        intent = str(row.get("intent") or "").strip()
        if query:
            queries.append(SearchQuery(query=query, intent=intent or query))
    return queries


def _search_all(queries: list[SearchQuery], payload: AiQuestionGenerationRequest) -> list[SearchResult]:
    results: list[SearchResult] = []
    for item in queries:
        try:
            results.extend(anysearch_search(item.query, max_results=RESULTS_PER_QUERY, intent=item.intent, api_key=payload.anysearch_api_key, endpoint=payload.anysearch_endpoint))
        except AnySearchError:
            continue
    return results


def _select_results(results: list[SearchResult], question_context: dict[str, Any], ai_chat_context: dict[str, Any]) -> list[SearchResult]:
    if not results:
        return []
    query_groups: dict[str, list[SearchResult]] = {}
    for item in results:
        query_groups.setdefault(item.query or item.intent or "default", []).append(item)
    selected: list[SearchResult] = []
    used_domains: Counter[str] = Counter()
    keywords = _context_tokens(question_context, ai_chat_context)
    for group in query_groups.values():
        ranked = sorted(group, key=lambda item: _result_score(item, keywords, used_domains), reverse=True)
        if ranked:
            _append_result(selected, ranked[0], used_domains)
        if len(selected) >= MAX_PAGES:
            break
    if len(selected) < MAX_PAGES:
        ranked_all = sorted(results, key=lambda item: _result_score(item, keywords, used_domains), reverse=True)
        for item in ranked_all:
            _append_result(selected, item, used_domains)
            if len(selected) >= MAX_PAGES:
                break
    return selected[:MAX_PAGES]


def _append_result(selected: list[SearchResult], item: SearchResult, used_domains: Counter[str]) -> None:
    if any(row.url == item.url for row in selected):
        return
    domain = _domain(item.url)
    if used_domains[domain] >= 2:
        return
    selected.append(item)
    used_domains[domain] += 1


def _result_score(item: SearchResult, keywords: set[str], used_domains: Counter[str]) -> float:
    haystack = f"{item.title} {item.snippet} {item.query} {item.intent}".lower()
    score = 0.0
    for keyword in keywords:
        if keyword and keyword.lower() in haystack:
            score += 2.0
    if any(marker in haystack for marker in ("docs", "documentation", "guide", "教程", "文档", "最佳实践", "reference")):
        score += 1.5
    if any(marker in haystack for marker in ("下载", "培训", "广告", "招聘", "课程", "优惠")):
        score -= 2.0
    score -= used_domains[_domain(item.url)] * 0.8
    return score


def _extract_ranked_chunks(
    selected: list[SearchResult],
    queries: list[SearchQuery],
    question_context: dict[str, Any],
    ai_chat_context: dict[str, Any],
    payload: AiQuestionGenerationRequest,
) -> list[WebChunk]:
    all_chunks: list[WebChunk] = []
    rank_query = _ranking_query(queries, question_context, ai_chat_context)
    for result in selected:
        try:
            markdown = anysearch_extract(result.url, api_key=payload.anysearch_api_key, endpoint=payload.anysearch_endpoint)
        except AnySearchError:
            continue
        chunks = _split_markdown(markdown, result)
        ranked = _rank_chunks(chunks, rank_query)
        all_chunks.extend(ranked[:MAX_SNIPPETS_PER_PAGE])
    return sorted(all_chunks, key=lambda item: item.score, reverse=True)


def _split_markdown(markdown: str, source: SearchResult) -> list[WebChunk]:
    cleaned = _clean_markdown(markdown)
    if not cleaned:
        return []
    chunks: list[WebChunk] = []
    heading = ""
    buffer: list[str] = []
    for line in cleaned.splitlines():
        stripped = line.strip()
        if not stripped:
            _flush_chunk(chunks, source, heading, buffer)
            buffer = []
            continue
        if stripped.startswith("#"):
            _flush_chunk(chunks, source, heading, buffer)
            buffer = []
            heading = stripped.lstrip("#").strip()
            continue
        buffer.append(stripped)
        if sum(len(item) for item in buffer) >= MAX_SNIPPET_CHARS:
            _flush_chunk(chunks, source, heading, buffer)
            buffer = []
    _flush_chunk(chunks, source, heading, buffer)
    return chunks


def _flush_chunk(chunks: list[WebChunk], source: SearchResult, heading: str, buffer: list[str]) -> None:
    text = "\n".join(buffer).strip()
    if len(text) < 80:
        return
    if len(text) > MAX_SNIPPET_CHARS:
        text = _trim_to_chars(text, MAX_SNIPPET_CHARS)
    chunks.append(WebChunk(source=source, heading=heading, text=text))


def _clean_markdown(markdown: str) -> str:
    rows: list[str] = []
    seen: set[str] = set()
    for line in markdown.replace("\r\n", "\n").splitlines():
        stripped = line.strip()
        if not stripped:
            rows.append("")
            continue
        compact = re.sub(r"\s+", " ", stripped)
        if compact in seen:
            continue
        seen.add(compact)
        if _is_noise_line(compact):
            continue
        rows.append(stripped)
    return "\n".join(rows)[:60000]


def _is_noise_line(line: str) -> bool:
    lowered = line.lower()
    if len(line) <= 2:
        return True
    if lowered.startswith(("cookie", "privacy policy", "terms of service")):
        return True
    noise = ("登录", "注册", "版权所有", "广告", "相关推荐", "分享", "关注我们", "加入会员", "app下载", "cookie")
    return any(item in lowered for item in noise)


def _rank_chunks(chunks: list[WebChunk], query: str) -> list[WebChunk]:
    if not chunks:
        return []
    docs = [_tokens(f"{chunk.heading} {chunk.text}") for chunk in chunks]
    query_tokens = _tokens(query)
    if not query_tokens:
        return chunks
    doc_freq: Counter[str] = Counter()
    for doc in docs:
        doc_freq.update(set(doc))
    avg_len = sum(len(doc) for doc in docs) / max(1, len(docs))
    for chunk, doc in zip(chunks, docs, strict=False):
        counts = Counter(doc)
        score = 0.0
        for token in query_tokens:
            freq = counts.get(token, 0)
            if not freq:
                continue
            idf = math.log(1 + (len(docs) - doc_freq[token] + 0.5) / (doc_freq[token] + 0.5))
            denom = freq + 1.2 * (1 - 0.75 + 0.75 * len(doc) / max(1, avg_len))
            score += idf * freq * 2.2 / denom
        chunk.score = score
    return sorted(chunks, key=lambda item: item.score, reverse=True)


def _format_web_context(chunks: list[WebChunk]) -> str:
    parts = [
        "联网参考资料：",
        "说明：以下内容来自搜索结果和网页原文片段，只作为参考，不代表绝对正确。",
    ]
    total = sum(len(line) for line in parts)
    grouped: dict[str, list[WebChunk]] = {}
    for chunk in chunks:
        grouped.setdefault(chunk.source.url, []).append(chunk)
    index = 1
    for url, rows in grouped.items():
        source = rows[0].source
        block = [
            f"\n[资料 {index}]",
            f"搜索意图：{source.intent or source.query}",
            f"来源标题：{source.title}",
            f"来源 URL：{url}",
            f"搜索摘要：{source.snippet[:500]}",
            "相关片段：",
        ]
        for chunk_index, chunk in enumerate(rows[:MAX_SNIPPETS_PER_PAGE], start=1):
            heading = chunk.heading or "正文"
            block.append(f"{chunk_index}. 标题路径：{heading}")
            block.append(f"原文片段：{chunk.text}")
        block_text = "\n".join(block)
        if total + len(block_text) > MAX_WEB_CONTEXT_CHARS:
            break
        parts.append(block_text)
        total += len(block_text)
        index += 1
    return "\n".join(parts)


def _ranking_query(queries: list[SearchQuery], question_context: dict[str, Any], ai_chat_context: dict[str, Any]) -> str:
    values = [
        " ".join(item.query for item in queries),
        " ".join(item.intent for item in queries),
        str(question_context.get("stem") or ""),
        str(question_context.get("answer") or ""),
        " ".join(question_context.get("knowledge_points") or []),
        " ".join(str(item.get("content") or "") for item in (ai_chat_context.get("messages") or [])[-8:] if isinstance(item, dict)),
    ]
    return " ".join(value for value in values if value)


def _context_tokens(question_context: dict[str, Any], ai_chat_context: dict[str, Any]) -> set[str]:
    text = _ranking_query([], question_context, ai_chat_context)
    return {token for token in _tokens(text) if len(token) >= 2}


def _tokens(text: str) -> list[str]:
    normalized = text.lower()
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9_\-]{1,}|[\u4e00-\u9fff]+", normalized)
    tokens: list[str] = []
    for word in words:
        if re.fullmatch(r"[\u4e00-\u9fff]+", word):
            if len(word) <= 2:
                tokens.append(word)
            else:
                tokens.extend(word[index : index + 2] for index in range(len(word) - 1))
        else:
            tokens.append(word)
    return [token for token in tokens if token not in _STOP_TOKENS]


def _trim_to_chars(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    sentence_end = max(cut.rfind("。"), cut.rfind("."), cut.rfind("\n"))
    if sentence_end > limit * 0.6:
        return cut[: sentence_end + 1].strip()
    return cut.strip()


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def _parse_json_object(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            raise
        data = json.loads(raw[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("AI search query JSON root is not object")
    return data


_STOP_TOKENS = {
    "什么",
    "哪些",
    "以下",
    "关于",
    "正确",
    "错误",
    "用户",
    "题目",
    "答案",
    "解析",
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "what",
    "how",
}
