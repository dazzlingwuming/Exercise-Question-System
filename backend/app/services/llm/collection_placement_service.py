"""让大模型根据集合说明推荐题目归档位置，但不直接写入数据库。"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.question_collection import ROOT_COLLECTION_ID, QuestionCollection
from app.schemas.ai import (
    AiCollectionPlacementAlternative,
    AiCollectionPlacementItem,
    AiCollectionPlacementRequest,
    AiCollectionPlacementResponse,
)
from app.services.collection_service import ensure_system_collections
from app.services.llm.deepseek_client import AiClientError, chat_completion


def recommend_collection_placements(
    db: Session,
    payload: AiCollectionPlacementRequest,
) -> AiCollectionPlacementResponse:
    """返回经服务端验证的集合建议；调用过程不会改变题目或集合。"""

    references = [item.reference_id for item in payload.questions]
    if len(references) != len(set(references)):
        raise AiClientError("AI_COLLECTION_PLACEMENT_DUPLICATE_REFERENCE", "待整理题目的引用 ID 不能重复。")

    ensure_system_collections(db)
    collections = list(
        db.scalars(
            select(QuestionCollection)
            .where(QuestionCollection.is_deleted.is_(False))
            .order_by(QuestionCollection.name, QuestionCollection.id)
        ).all()
    )
    candidates = [item for item in collections if item.id != ROOT_COLLECTION_ID]
    if not candidates:
        raise AiClientError("AI_COLLECTION_PLACEMENT_NO_COLLECTION", "当前没有可用于归档的集合，请先创建集合。")

    collection_by_id = {item.id: item for item in collections}
    directory_payload = [
        {
            "collection_id": item.id,
            "path": _collection_path(item, collection_by_id),
            "description": (item.description or "")[:1000],
        }
        for item in candidates
    ]
    question_payload = [
        {
            "reference_id": item.reference_id,
            "type": item.type,
            "stem": item.stem[:4000],
            "material": (item.material or "")[:1200],
            "tags": item.tags[:20],
            "directions": item.directions[:20],
            "exam_points": item.exam_points[:20],
            "current_collection_id": item.current_collection_id,
        }
        for item in payload.questions
    ]
    messages = _placement_messages(directory_payload, question_payload)
    raw = _call_model(payload, messages)
    try:
        return _validate_response(raw, references, {item.id for item in candidates})
    except (ValueError, TypeError, json.JSONDecodeError):
        repaired = _call_model(
            payload,
            [
                *messages,
                {"role": "assistant", "content": raw[:6000]},
                {
                    "role": "user",
                    "content": "上一份结果无法通过校验。请严格按要求重新输出完整 JSON；只能使用给定 collection_id，且每个 reference_id 恰好出现一次。",
                },
            ],
        )
        try:
            return _validate_response(repaired, references, {item.id for item in candidates})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            raise AiClientError(
                "AI_COLLECTION_PLACEMENT_BAD_FORMAT",
                "AI 返回的集合推荐格式无效，请重试或改为人工选择。",
            ) from exc


def _placement_messages(directories: list[dict[str, Any]], questions: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "你是题库归档助手。你只能从用户提供的 collection_id 中选择最适合题目的集合。"
                "集合名称、完整路径和收录范围说明共同决定归档位置。优先选择最具体的集合；证据不足时可以选择未归档。"
                "你只负责建议，不得修改题目。输出必须是严格 JSON，不要 Markdown 或额外解释。"
            ),
        },
        {
            "role": "user",
            "content": (
                "请为每道题推荐一个集合。每个 reference_id 必须恰好返回一次，collection_id 必须来自候选目录。\n"
                "输出结构：\n"
                '{"placements":[{"reference_id":"...","collection_id":"...","confidence":0.0,'
                '"reason":"简短中文理由","alternatives":[{"collection_id":"...","confidence":0.0}]}]}\n'
                "confidence 范围是 0 到 1，alternatives 最多 3 个且不能包含主推荐。\n\n"
                f"候选目录：\n{json.dumps(directories, ensure_ascii=False)}\n\n"
                f"待整理题目：\n{json.dumps(questions, ensure_ascii=False)}"
            ),
        },
    ]


def _call_model(payload: AiCollectionPlacementRequest, messages: list[dict[str, str]]) -> str:
    return chat_completion(
        api_key=payload.api_key or settings.deepseek_api_key or "",
        base_url=payload.base_url or settings.deepseek_base_url,
        model=payload.generation_model or payload.model or "deepseek-v4-pro",
        messages=messages,
        max_tokens=3200,
        response_format={"type": "json_object"},
    )


def _validate_response(raw: str, references: list[str], allowed_collection_ids: set[str]) -> AiCollectionPlacementResponse:
    data = _parse_json_object(raw)
    placements = data.get("placements")
    if not isinstance(placements, list):
        raise ValueError("placements missing")
    by_reference: dict[str, AiCollectionPlacementItem] = {}
    for raw_item in placements:
        if not isinstance(raw_item, dict):
            raise ValueError("placement is not an object")
        reference_id = str(raw_item.get("reference_id") or "")
        collection_id = str(raw_item.get("collection_id") or "")
        if reference_id not in references or reference_id in by_reference:
            raise ValueError("unknown or duplicate reference")
        if collection_id not in allowed_collection_ids:
            raise ValueError("unknown collection")
        confidence = _confidence(raw_item.get("confidence"))
        reason = str(raw_item.get("reason") or "").strip()
        if not reason:
            raise ValueError("reason missing")
        alternatives: list[AiCollectionPlacementAlternative] = []
        seen = {collection_id}
        for alternative in raw_item.get("alternatives") or []:
            if not isinstance(alternative, dict):
                continue
            alternative_id = str(alternative.get("collection_id") or "")
            if alternative_id not in allowed_collection_ids or alternative_id in seen:
                continue
            seen.add(alternative_id)
            alternatives.append(
                AiCollectionPlacementAlternative(
                    collection_id=alternative_id,
                    confidence=_confidence(alternative.get("confidence")),
                )
            )
            if len(alternatives) == 3:
                break
        by_reference[reference_id] = AiCollectionPlacementItem(
            reference_id=reference_id,
            recommended_collection_id=collection_id,
            confidence=confidence,
            reason=reason[:500],
            alternatives=alternatives,
        )
    if set(by_reference) != set(references):
        raise ValueError("placements incomplete")
    return AiCollectionPlacementResponse(items=[by_reference[reference] for reference in references])


def _parse_json_object(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(lines[1:-1]).strip() if len(lines) >= 3 else cleaned
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start < 0 or end <= start:
            raise
        data = json.loads(cleaned[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("response is not an object")
    return data


def _confidence(raw: object) -> float:
    value = float(raw)
    if value < 0 or value > 1:
        raise ValueError("confidence out of range")
    return value


def _collection_path(collection: QuestionCollection, by_id: dict[str, QuestionCollection]) -> str:
    names: list[str] = []
    current: QuestionCollection | None = collection
    seen: set[str] = set()
    while current is not None and current.id not in seen:
        seen.add(current.id)
        if current.id != ROOT_COLLECTION_ID:
            names.append(current.name)
        current = by_id.get(current.parent_id or "")
    return " / ".join(reversed(names)) or collection.name
