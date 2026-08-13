"""AI 集合推荐与候选题确认归档的回归测试。"""

import json

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

import app.services.llm.collection_placement_service as placement_service
from app.database import Base
from app.models.ai_question_generation import AiQuestionCandidate
from app.models.question import Question
from app.schemas.ai import AiCollectionPlacementQuestion, AiCollectionPlacementRequest
from app.schemas.collection import CollectionCreate
from app.services.collection_service import create_collection, ensure_system_collections
from app.services.llm.ai_question_generation_service import accept_candidate
from app.services.llm.deepseek_client import AiClientError


def make_db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    ensure_system_collections(db)
    db.commit()
    return db


def request() -> AiCollectionPlacementRequest:
    return AiCollectionPlacementRequest(
        api_key="test-key",
        questions=[
            AiCollectionPlacementQuestion(
                reference_id="draft-1",
                type="single_choice",
                stem="RAG 中召回率和精确率分别衡量什么？",
                tags=["RAG"],
                exam_points=["检索评估"],
            )
        ],
    )


def test_recommendation_is_validated_and_does_not_write_questions(monkeypatch: pytest.MonkeyPatch) -> None:
    db = make_db()
    rag = create_collection(db, CollectionCreate(name="RAG", description="检索增强生成、召回与评估"))
    monkeypatch.setattr(
        placement_service,
        "chat_completion",
        lambda **_: json.dumps(
            {
                "placements": [
                    {
                        "reference_id": "draft-1",
                        "collection_id": rag.id,
                        "confidence": 0.93,
                        "reason": "题目考查检索评估。",
                        "alternatives": [],
                    }
                ]
            },
            ensure_ascii=False,
        ),
    )

    result = placement_service.recommend_collection_placements(db, request())

    assert result.items[0].recommended_collection_id == rag.id
    assert result.items[0].confidence == 0.93
    assert db.scalar(select(Question)) is None


def test_invalid_first_response_is_repaired_once(monkeypatch: pytest.MonkeyPatch) -> None:
    db = make_db()
    rag = create_collection(db, CollectionCreate(name="RAG"))
    responses = iter(
        [
            '{"placements": []}',
            json.dumps(
                {
                    "placements": [
                        {
                            "reference_id": "draft-1",
                            "collection_id": rag.id,
                            "confidence": 0.8,
                            "reason": "与集合主题一致。",
                        }
                    ]
                },
                ensure_ascii=False,
            ),
        ]
    )
    calls: list[object] = []

    def fake_chat_completion(**kwargs: object) -> str:
        calls.append(kwargs)
        return next(responses)

    monkeypatch.setattr(placement_service, "chat_completion", fake_chat_completion)

    result = placement_service.recommend_collection_placements(db, request())

    assert result.items[0].recommended_collection_id == rag.id
    assert len(calls) == 2


def test_two_invalid_responses_return_recoverable_error(monkeypatch: pytest.MonkeyPatch) -> None:
    db = make_db()
    create_collection(db, CollectionCreate(name="RAG"))
    monkeypatch.setattr(placement_service, "chat_completion", lambda **_: '{"placements": []}')

    with pytest.raises(AiClientError) as caught:
        placement_service.recommend_collection_placements(db, request())

    assert caught.value.code == "AI_COLLECTION_PLACEMENT_BAD_FORMAT"


def test_accept_candidate_uses_user_confirmed_collection() -> None:
    db = make_db()
    target = create_collection(db, CollectionCreate(name="AI 生成题"))
    candidate = AiQuestionCandidate(
        id="candidate-1",
        generation_id="generation-1",
        candidate_json={
            "type": "single_choice",
            "type_label": "单选题",
            "difficulty": "2",
            "tags": ["RAG"],
            "directions": [],
            "stem": "哪一项正确？",
            "options": [{"key": "A", "text": "正确"}, {"key": "B", "text": "错误"}],
            "standard_answer": "A",
            "explanation": "A 正确。",
            "exam_points": [],
        },
        structure_validation_json={"ok": True, "errors": [], "warnings": []},
        ai_validation_json={"is_consistent": True, "quality_score": 9, "problems": [], "suggestions": []},
        similar_questions_json=[],
        status="pending",
    )
    db.add(candidate)
    db.commit()

    result = accept_candidate(db, candidate.id, target.id)

    assert result.question_id
    assert db.get(Question, result.question_id).collection_id == target.id
