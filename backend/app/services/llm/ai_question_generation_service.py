"""中文说明：AI 题目生成、候选题校验和确认入库服务。"""

from __future__ import annotations

import json
import re
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.ai_question_generation import AiQuestionCandidate, AiQuestionGeneration
from app.models.ai_tutor import AiTutorMessage, AiTutorThread
from app.models.attempt import Attempt
from app.models.question import Question
from app.schemas.ai import (
    AiGeneratedQuestionCandidate,
    AiQuestionCandidateAcceptResponse,
    AiQuestionCandidateRejectResponse,
    AiQuestionCandidateUpdateRequest,
    AiQuestionGenerationRequest,
    AiQuestionGenerationResponse,
    AiQuestionQualityValidation,
    AiStructureValidation,
    SimilarQuestionRead,
)
from app.schemas.question import OptionSchema, QuestionCreate, QuestionRead
from app.services.llm.deepseek_client import AiClientError, chat_completion
from app.services.question_create_service import TYPE_LABELS, create_question
from app.services.question_validation_service import QuestionValidationError, validate_question_for_save
from app.services.search.web_context_service import build_web_reference_context


DIFFICULTY_STRATEGY_LABELS = {
    "keep": "保持原难度",
    "lower": "降低难度，偏基础概念和关键点识别",
    "higher": "提高难度，偏工程场景、排查流程、系统设计或面试深挖",
}


def generate_question_candidates(db: Session, payload: AiQuestionGenerationRequest) -> AiQuestionGenerationResponse:
    """
    中文说明：
    基于当前题目、用户答案、AI 讲题对话和 AI 主观题评分上下文生成候选题。
    生成结果不会直接进入正式题库，而是保存到候选池，等待用户确认。
    """

    question = _get_question(db, payload.question_id)
    if payload.target_type not in TYPE_LABELS:
        raise AiClientError("AI_GENERATION_BAD_TYPE", "不支持的目标题型。")
    count = max(1, min(int(payload.count or 1), 5))
    raw = chat_completion(
        api_key=payload.api_key or "",
        base_url=payload.base_url or "https://api.deepseek.com",
        model=payload.model or "deepseek-v4-pro",
        messages=_generation_messages(db, question, payload, count),
        max_tokens=6000,
        response_format={"type": "json_object"},
    )
    data = _parse_json_object(raw)
    items = data.get("candidates")
    if not isinstance(items, list) or not items:
        raise AiClientError("AI_GENERATION_BAD_FORMAT", "AI 返回的候选题格式不完整，请重试。")

    generation = AiQuestionGeneration(
        id=f"gen_{uuid4().hex}",
        source_question_id=question.id,
        attempt_id=payload.attempt_id,
        clicked_ai_message=payload.clicked_ai_message,
        target_type=payload.target_type,
        count=count,
        difficulty_strategy=payload.difficulty_strategy,
        generation_direction=payload.generation_direction,
    )
    db.add(generation)
    candidates: list[AiQuestionCandidate] = []
    for item in items[:count]:
        candidate_payload = _candidate_to_question_create(item, payload.target_type, question, payload.difficulty_strategy)
        structure = _validate_candidate(candidate_payload)
        ai_validation = _quality_validate(payload, candidate_payload) if structure.ok else AiQuestionQualityValidation(
            is_consistent=False,
            quality_score=0,
            problems=["结构校验未通过，跳过 AI 质量校验。"],
            suggestions=structure.errors,
        )
        similar = _find_top_similar_questions(db, candidate_payload.stem)
        candidate = AiQuestionCandidate(
            id=f"cand_{uuid4().hex}",
            generation_id=generation.id,
            candidate_json=candidate_payload.model_dump(),
            structure_validation_json=structure.model_dump(),
            ai_validation_json=ai_validation.model_dump(),
            similar_questions_json=[item.model_dump() for item in similar],
            status="pending",
        )
        db.add(candidate)
        candidates.append(candidate)
    db.commit()
    return _generation_response(db, generation.id)


def get_generation(db: Session, generation_id: str) -> AiQuestionGenerationResponse:
    """中文说明：读取一次 AI 题目生成结果，支持确认页刷新恢复。"""

    return _generation_response(db, generation_id)


def accept_candidate(db: Session, candidate_id: str) -> AiQuestionCandidateAcceptResponse:
    """中文说明：用户确认后把候选题写入正式题库。"""

    candidate = _get_candidate(db, candidate_id)
    if candidate.status == "accepted" and candidate.accepted_question_id:
        question = db.get(Question, candidate.accepted_question_id)
        return AiQuestionCandidateAcceptResponse(candidate_id=candidate.id, status=candidate.status, question=QuestionRead.model_validate(question) if question else None, question_id=candidate.accepted_question_id)
    if candidate.status == "rejected":
        raise AiClientError("AI_CANDIDATE_REJECTED", "该候选题已取消，不能入库。")

    structure = AiStructureValidation.model_validate(candidate.structure_validation_json)
    if not structure.ok:
        raise AiClientError("AI_CANDIDATE_INVALID", "候选题结构校验未通过，请重新生成。")
    payload = QuestionCreate.model_validate(candidate.candidate_json)
    payload.reason = payload.reason or "AI 题目生成确认入库"
    question = create_question(db, payload)
    candidate.status = "accepted"
    candidate.accepted_question_id = question.id
    db.add(candidate)
    db.commit()
    db.refresh(question)
    return AiQuestionCandidateAcceptResponse(candidate_id=candidate.id, status="accepted", question=QuestionRead.model_validate(question), question_id=question.id)


def reject_candidate(db: Session, candidate_id: str) -> AiQuestionCandidateRejectResponse:
    """中文说明：用户取消候选题，保留记录但不进入正式题库。"""

    candidate = _get_candidate(db, candidate_id)
    if candidate.status != "accepted":
        candidate.status = "rejected"
        db.add(candidate)
        db.commit()
    return AiQuestionCandidateRejectResponse(candidate_id=candidate.id, status=candidate.status)


def update_candidate(db: Session, candidate_id: str, payload: AiQuestionCandidateUpdateRequest) -> AiGeneratedQuestionCandidate:
    """中文说明：保存用户对 AI 候选题的人工编辑，更新结构校验和相似题。"""

    candidate = _get_candidate(db, candidate_id)
    if candidate.status != "pending":
        raise AiClientError("AI_CANDIDATE_LOCKED", "只有待确认候选题可以编辑。")
    question = payload.question
    structure = _validate_candidate(question)
    similar = _find_top_similar_questions(db, question.stem)
    candidate.candidate_json = question.model_dump()
    candidate.structure_validation_json = structure.model_dump()
    candidate.similar_questions_json = [item.model_dump() for item in similar]
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return AiGeneratedQuestionCandidate(
        candidate_id=candidate.id,
        question=QuestionCreate.model_validate(candidate.candidate_json),
        structure_validation=AiStructureValidation.model_validate(candidate.structure_validation_json),
        ai_validation=AiQuestionQualityValidation.model_validate(candidate.ai_validation_json),
        similar_questions=[SimilarQuestionRead.model_validate(row) for row in candidate.similar_questions_json],
        status=candidate.status,
        accepted_question_id=candidate.accepted_question_id,
    )


def _generation_messages(db: Session, question: Question, payload: AiQuestionGenerationRequest, count: int) -> list[dict[str, str]]:
    question_context = {
        "question_id": question.id,
        "module": question.directions or question.tags,
        "type": question.type,
        "difficulty": question.difficulty,
        "knowledge_points": question.exam_points,
        "stem": question.stem,
        "material": question.material,
        "options": question.options,
        "answer": question.standard_answer,
        "reference_answer": question.answer_text,
        "explanation": question.explanation,
        "common_mistakes": question.common_mistakes,
        "interview_followups": question.follow_up_question,
        "scoring_standard": question.scoring_standard,
    }
    attempt = _latest_attempt(db, question.id, payload.attempt_id)
    answer_context = {
        "attempt_id": attempt.id if attempt else None,
        "user_answer": attempt.user_answer_raw if attempt else None,
        "is_correct": attempt.is_correct if attempt else None,
        "score": attempt.score if attempt else None,
        "answer_time": attempt.created_at.isoformat() if attempt and attempt.created_at else None,
    }
    grading_context = _grading_context(db, question.id, attempt.id if attempt else payload.attempt_id)
    ai_chat_context = _ai_chat_context(db, question.id, payload.attempt_id, payload.clicked_ai_message)
    taxonomy_context = _taxonomy_context(db)
    web_reference_context = build_web_reference_context(
        payload=payload,
        question_context=question_context,
        answer_context=answer_context,
        grading_context=grading_context,
        ai_chat_context=ai_chat_context,
        taxonomy_context=taxonomy_context,
    )
    user_prompt = f"""
请基于下面的当前题目作答上下文，生成 {count} 道新的候选题。

用户选择的题型：{payload.target_type}
用户选择的题型中文：{TYPE_LABELS[payload.target_type]}
用户选择的难度策略：{DIFFICULTY_STRATEGY_LABELS.get(payload.difficulty_strategy, "保持原难度")}
用户输入的生成方向：{payload.generation_direction or ""}

如果用户没有输入生成方向，则优先根据用户答案缺失点、AI 评分扣分点、AI 追问暴露出的薄弱点生成；如果缺失点不明显，则基于当前题目的核心知识点生成变式题。

生成要求：
1. 必须生成 {count} 道题。
2. 每道题必须符合用户选择的题型，type 必须等于 {payload.target_type}。
3. 每道题必须可以独立作答，不要引用“上题”“刚才对话”。
4. 不要复制原题题干，也不要只改几个词制造伪变式。
5. 题干、答案、解析、评分点必须一致。
6. 单选题只能有一个正确答案，多选题必须有两个或两个以上正确答案。
7. 主观题必须包含 reference_answer、answer_keywords、scoring_points、common_mistakes、interview_followups。
8. 输出必须是严格 JSON，顶层字段为 candidates。
9. directions、knowledge_points/exam_points、tags 应优先从“题库已有分类全集”里选择最匹配项。
10. 如果现有分类确实没有合适项，可以新增更准确的方向、考察点或标签，但不要随意造泛泛分类。
11. 如果提供了联网参考资料，只能把它作为补充工程背景、术语和场景的参考。
12. 联网资料可能错误、过时或片面；如果它与当前题库上下文冲突，以当前题目、标准答案、用户作答和题库分类为准。
13. 不要直接复制网页原文生成题干、选项或标准答案；候选题必须可以脱离联网资料独立作答。

当前题目上下文：
{json.dumps(question_context, ensure_ascii=False)}

用户答案上下文：
{json.dumps(answer_context, ensure_ascii=False)}

AI 评分上下文：
{json.dumps(grading_context, ensure_ascii=False)}

AI 对话上下文：
{json.dumps(ai_chat_context, ensure_ascii=False)}

题库已有分类全集：
{json.dumps(taxonomy_context, ensure_ascii=False)}

{web_reference_context}
"""
    return [
        {
            "role": "system",
            "content": "你是一个技术面试题库出题助手。你只能基于当前题目的完整作答上下文生成新的候选题，优先补齐用户暴露出的薄弱点。输出必须是严格 JSON，不要输出 Markdown 或解释性文本。",
        },
        {"role": "user", "content": user_prompt},
    ]


def _quality_validate(payload: AiQuestionGenerationRequest, question: QuestionCreate) -> AiQuestionQualityValidation:
    validation_target = {
        "type": question.type,
        "stem": question.stem,
        "options": [option.model_dump() for option in question.options],
        "standard_answer": question.standard_answer,
        "explanation": question.explanation,
        "reference_answer": question.standard_answer if question.type not in {"single_choice", "multiple_choice", "true_false", "fill_blank"} else None,
    }
    raw = chat_completion(
        api_key=payload.api_key or "",
        base_url=payload.base_url or "https://api.deepseek.com",
        model=payload.model or "deepseek-v4-pro",
        messages=[
            {
                "role": "system",
                "content": (
                    "你是严格的技术题库质量审核员。你的任务是判断候选题本身是否是一道合理题目，"
                    "重点检查题干、选项、标准答案和解析是否自洽。不要把重点放在评分标准是否详细。"
                    "输出必须是严格 JSON。"
                ),
            },
            {
                "role": "user",
                "content": (
                    "请审核下面这道候选题是否合理。\n\n"
                    "核心审核标准：\n"
                    "1. 题干是否聚焦、清楚、可以独立理解。\n"
                    "2. 每个选项是否都在回答题干问题，是否存在明显跑题选项。\n"
                    "3. 标准答案是否与题干和选项严格匹配。\n"
                    "4. 单选题是否只有一个最优答案；多选题所有正确项是否都确实正确，错误项是否确实错误。\n"
                    "5. 解析是否能直接解释为什么这些选项正确或错误。\n"
                    "6. 如果题干描述多个问题，正确选项必须分别覆盖这些问题，不能只回答其中一小部分。\n"
                    "7. 如果题干和答案/选项不在同一个问题域，必须判为不一致，质量分不超过 5。\n\n"
                    "不要主要评价评分标准是否细致，评分标准不是本次审核重点。\n\n"
                    "输出 JSON 字段：\n"
                    "{\n"
                    "  \"is_consistent\": true/false,\n"
                    "  \"quality_score\": 0-10,\n"
                    "  \"problems\": [\"指出题干、选项、答案或解析中的具体问题\"],\n"
                    "  \"suggestions\": [\"如何修改题干、选项或答案让题目更合理\"]\n"
                    "}\n\n"
                    "候选题：\n"
                    + json.dumps(validation_target, ensure_ascii=False)
                ),
            },
        ],
        max_tokens=1200,
        response_format={"type": "json_object"},
    )
    try:
        data = _parse_json_object(raw)
        data = _unwrap_quality_validation(data)
        return AiQuestionQualityValidation(
            is_consistent=bool(data.get("is_consistent")),
            quality_score=float(data.get("quality_score") or 0),
            problems=_string_list(data.get("problems")),
            suggestions=_string_list(data.get("suggestions")),
        )
    except Exception:
        return AiQuestionQualityValidation(is_consistent=False, quality_score=0, problems=["AI 质量校验结果无法解析。"], suggestions=["请重新生成或人工检查。"])


def _candidate_to_question_create(raw: Any, target_type: str, source: Question, difficulty_strategy: str) -> QuestionCreate:
    item = raw if isinstance(raw, dict) else {}
    options = _normalize_options(item.get("options"))
    reference_answer = item.get("reference_answer") or item.get("answer_text")
    standard_answer = item.get("answer")
    if standard_answer in (None, "", []):
        standard_answer = reference_answer
    if target_type == "true_false" and not options:
        options = [OptionSchema(key="A", text="正确"), OptionSchema(key="B", text="错误")]
    scoring_standard = item.get("scoring_standard") or _scoring_text(item)
    return QuestionCreate(
        type=target_type,
        type_label=TYPE_LABELS.get(target_type, target_type),
        difficulty=_difficulty_for_strategy(source.difficulty, item.get("difficulty"), difficulty_strategy),
        tags=_merge_unique(["AI生成"], _string_list(item.get("tags"))),
        directions=_string_list(item.get("directions") or item.get("module") or source.directions),
        stem=str(item.get("stem") or "").strip(),
        material=_optional_text(item.get("material")),
        options=options,
        standard_answer=_normalize_answer(standard_answer, target_type),
        explanation=_optional_text(item.get("explanation") or item.get("option_analysis")),
        exam_points=_string_list(item.get("knowledge_points") or item.get("exam_points") or source.exam_points),
        common_mistakes=_join_text(item.get("common_mistakes")),
        follow_up_question=_join_text(item.get("interview_followups") or item.get("follow_up_question")),
        scoring_standard=scoring_standard,
        reason="AI 题目生成确认入库",
    )


def _validate_candidate(payload: QuestionCreate) -> AiStructureValidation:
    errors: list[str] = []
    warnings: list[str] = []
    if not payload.exam_points:
        warnings.append("候选题没有明确考察点。")
    data = {
        "stem": payload.stem,
        "type": payload.type,
        "options": [option.model_dump() for option in payload.options],
        "standard_answer": payload.standard_answer,
        "scoring_standard": payload.scoring_standard,
    }
    try:
        validate_question_for_save(data)
    except QuestionValidationError as exc:
        errors.append(str(exc))
    if payload.type in {"short_answer", "concept_analysis", "scenario_analysis", "interview", "debug_analysis", "code_reading", "system_design", "project_follow_up", "mock_interview"}:
        if not str(payload.standard_answer or "").strip():
            errors.append("主观题参考答案不能为空")
        if not str(payload.scoring_standard or "").strip():
            warnings.append("主观题缺少评分标准。")
    return AiStructureValidation(ok=not errors, errors=errors, warnings=warnings)


def _find_top_similar_questions(db: Session, stem: str, top_k: int = 3) -> list[SimilarQuestionRead]:
    questions = db.scalars(select(Question).where(Question.is_deleted.is_(False))).all()
    rows = [
        SimilarQuestionRead(question_id=question.id, stem=question.stem, similarity_score=round(_similarity(stem, question.stem), 2))
        for question in questions
        if question.stem
    ]
    return sorted(rows, key=lambda item: item.similarity_score, reverse=True)[:top_k]


def _generation_response(db: Session, generation_id: str) -> AiQuestionGenerationResponse:
    generation = db.get(AiQuestionGeneration, generation_id)
    if not generation:
        raise AiClientError("AI_GENERATION_NOT_FOUND", "候选题生成记录不存在。")
    candidates = db.scalars(select(AiQuestionCandidate).where(AiQuestionCandidate.generation_id == generation_id).order_by(AiQuestionCandidate.created_at.asc(), AiQuestionCandidate.id.asc())).all()
    return AiQuestionGenerationResponse(
        generation_id=generation.id,
        source_question_id=generation.source_question_id,
        candidates=[
            AiGeneratedQuestionCandidate(
                candidate_id=item.id,
                question=QuestionCreate.model_validate(item.candidate_json),
                structure_validation=AiStructureValidation.model_validate(item.structure_validation_json),
                ai_validation=AiQuestionQualityValidation.model_validate(item.ai_validation_json),
                similar_questions=[SimilarQuestionRead.model_validate(row) for row in item.similar_questions_json],
                status=item.status,
                accepted_question_id=item.accepted_question_id,
            )
            for item in candidates
        ],
    )


def _get_question(db: Session, question_id: str) -> Question:
    question = db.get(Question, question_id)
    if not question or question.is_deleted:
        raise AiClientError("QUESTION_NOT_FOUND", "题目不存在或已删除。")
    return question


def _get_candidate(db: Session, candidate_id: str) -> AiQuestionCandidate:
    candidate = db.get(AiQuestionCandidate, candidate_id)
    if not candidate:
        raise AiClientError("AI_CANDIDATE_NOT_FOUND", "候选题不存在。")
    return candidate


def _latest_attempt(db: Session, question_id: str, attempt_id: str | None) -> Attempt | None:
    if attempt_id:
        return db.get(Attempt, attempt_id)
    return db.scalars(select(Attempt).where(Attempt.question_id == question_id).order_by(Attempt.created_at.desc()).limit(1)).first()


def _grading_context(db: Session, question_id: str, attempt_id: str | None) -> dict[str, Any]:
    if not attempt_id:
        return {}
    result = db.scalars(
        select(AiGradingResult)
        .where(AiGradingResult.question_id == question_id, AiGradingResult.attempt_id == attempt_id)
        .order_by(AiGradingResult.created_at.desc(), AiGradingResult.id.desc())
        .limit(1)
    ).first()
    if not result:
        return {}
    messages = db.scalars(select(AiGradingMessage).where(AiGradingMessage.grading_id == result.id).order_by(AiGradingMessage.created_at.asc(), AiGradingMessage.id.asc())).all()
    return {
        "total_score": result.score,
        "max_score": result.max_score,
        "summary": result.summary,
        "result": result.result_json,
        "messages": [{"role": item.role, "stage": item.stage, "content": item.content} for item in messages],
    }


def _ai_chat_context(db: Session, question_id: str, attempt_id: str | None, clicked_ai_message: str | None) -> dict[str, Any]:
    threads = list(db.scalars(select(AiTutorThread).where(AiTutorThread.question_id == question_id).order_by(AiTutorThread.created_at.asc())).all())
    if attempt_id:
        threads = [item for item in threads if item.attempt_id in {None, attempt_id}]
    messages: list[dict[str, str]] = []
    for thread in threads:
        rows = db.scalars(select(AiTutorMessage).where(AiTutorMessage.thread_id == thread.id).order_by(AiTutorMessage.created_at.asc())).all()
        messages.extend({"role": row.role, "stage": row.stage, "content": row.content} for row in rows)
    return {"clicked_ai_message": clicked_ai_message, "messages": messages}


def _taxonomy_context(db: Session) -> dict[str, list[str]]:
    """中文说明：给 AI 提供当前题库已有分类，便于复用方向、考察点和标签。"""

    questions = db.scalars(select(Question).where(Question.is_deleted.is_(False))).all()
    return {
        "directions": sorted({direction for question in questions for direction in (question.directions or []) if direction}),
        "exam_points": sorted({point for question in questions for point in (question.exam_points or []) if point}),
        "tags": sorted({tag for question in questions for tag in (question.tags or []) if tag}),
    }


def _parse_json_object(raw: str) -> dict[str, Any]:
    raw = _strip_json_fence(raw.strip())
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            raise
        data = json.loads(raw[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("AI JSON root is not object")
    return data


def _strip_json_fence(raw: str) -> str:
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _unwrap_quality_validation(data: dict[str, Any]) -> dict[str, Any]:
    """中文说明：兼容模型把校验结果包在 result/validation/review 等字段里的情况。"""

    if "is_consistent" in data or "quality_score" in data:
        return data
    for key in ("result", "validation", "review", "quality_validation", "ai_validation"):
        value = data.get(key)
        if isinstance(value, dict) and ("is_consistent" in value or "quality_score" in value):
            return value
    return data


def _normalize_options(raw: Any) -> list[OptionSchema]:
    if raw is None:
        return []
    items: list[Any]
    if isinstance(raw, dict):
        items = [{"key": key, "text": value} for key, value in raw.items()]
    elif isinstance(raw, list):
        items = raw
    else:
        return []
    result: list[OptionSchema] = []
    for index, item in enumerate(items):
        if isinstance(item, dict):
            key = str(item.get("key") or item.get("label") or chr(ord("A") + index)).strip().upper()
            text = str(item.get("text") or item.get("content") or item.get("value") or "").strip()
        else:
            key = chr(ord("A") + index)
            text = str(item).strip()
        text = _strip_option_prefix(text, key)
        if key and text:
            result.append(OptionSchema(key=key, text=text))
    return result


def _normalize_answer(value: Any, question_type: str) -> Any:
    if question_type == "multiple_choice" and isinstance(value, str):
        return [item.upper() for item in value.replace("，", ",").replace("、", ",").split(",") if item.strip()] if "," in value or "、" in value or "，" in value else [item.upper() for item in value if item.strip().isalpha()]
    if question_type == "single_choice" and isinstance(value, list):
        return str(value[0]) if value else ""
    if question_type == "true_false":
        return _normalize_true_false_answer(value)
    return value


def _normalize_true_false_answer(value: Any) -> str:
    """中文说明：AI 常把判断题答案写成 A/B，这里统一转成判分器可识别的正确/错误。"""

    if isinstance(value, list):
        value = value[0] if value else ""
    text = str(value or "").strip().lower()
    text = text.replace("。", "").replace(".", "").replace("、", "").replace("：", "").replace(":", "")
    if text in {"a", "true", "yes", "y", "正确", "对", "是", "√", "1"}:
        return "正确"
    if text in {"b", "false", "no", "n", "错误", "错", "否", "×", "x", "0"}:
        return "错误"
    if "正确" in text or text.startswith("对"):
        return "正确"
    if "错误" in text or text.startswith("错"):
        return "错误"
    return str(value or "").strip()


def _strip_option_prefix(text: str, key: str) -> str:
    """中文说明：清理 AI 生成选项文本里重复携带的 A./A、 等编号。"""

    if not text:
        return ""
    escaped_key = re.escape(key)
    patterns = [
        rf"^\s*{escaped_key}\s*[\.\。．、:：\)]\s*",
        rf"^\s*[（\(]\s*{escaped_key}\s*[）\)]\s*",
    ]
    cleaned = text
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _difficulty_for_strategy(source_difficulty: str | None, generated: Any, strategy: str) -> str | None:
    if strategy == "keep":
        return str(source_difficulty or generated or "").strip() or None
    if strategy == "lower":
        return "基础"
    if strategy == "higher":
        return "进阶"
    return str(generated or source_difficulty or "").strip() or None


def _scoring_text(item: dict[str, Any]) -> str | None:
    parts: list[str] = []
    for key in ("answer_keywords", "scoring_points", "diagnosis_steps", "optimization_points", "architecture_points", "data_flow", "evaluation_metrics", "risk_points"):
        value = item.get(key)
        if value:
            parts.append(f"{key}: {_join_text(value)}")
    return "\n".join(parts) if parts else None


def _join_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        rows: list[str] = []
        for item in value:
            if isinstance(item, dict):
                rows.append("；".join(f"{key}: {val}" for key, val in item.items()))
            else:
                rows.append(str(item))
        return "\n".join(row for row in rows if row.strip()) or None
    if isinstance(value, dict):
        return "\n".join(f"{key}: {val}" for key, val in value.items())
    return str(value).strip() or None


def _optional_text(value: Any) -> str | None:
    text = _join_text(value)
    return text if text else None


def _string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [item.strip() for item in value.replace("，", "、").replace(",", "、").split("、") if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return [str(value).strip()] if str(value).strip() else []


def _merge_unique(first: list[str], second: list[str]) -> list[str]:
    result: list[str] = []
    for item in first + second:
        if item and item not in result:
            result.append(item)
    return result


def _similarity(a: str, b: str) -> float:
    left = _stem_tokens(a)
    right = _stem_tokens(b)
    if not left or not right:
        return 0.0
    intersection = len(left & right)
    union = len(left | right)
    if not union:
        return 0.0
    overlap = intersection / min(len(left), len(right))
    jaccard = intersection / union
    # Jaccard 控制整体相似，overlap 防止短题干被过度低估。
    return min(100.0, (jaccard * 0.75 + overlap * 0.25) * 100)


def _stem_tokens(text: str) -> set[str]:
    normalized = _normalize_stem_text(text)
    if not normalized:
        return set()
    tokens: set[str] = set()
    for size in (2, 3):
        tokens.update(normalized[index : index + size] for index in range(0, len(normalized) - size + 1))
    return tokens


def _normalize_stem_text(text: str) -> str:
    normalized = re.sub(r"\s+", "", text.lower())
    normalized = re.sub(r"[，。！？、；：：“”‘’（）()《》【】\[\]{}<>,.!?;:\"'`~@#$%^&*_+=|\\/\\-]", "", normalized)
    stop_phrases = [
        "以下关于",
        "以下哪一项",
        "哪一项",
        "哪项",
        "是正确的",
        "描述是正确的",
        "描述正确",
        "关于",
        "以下",
        "正确",
        "错误",
        "主要",
        "特点",
    ]
    for phrase in stop_phrases:
        normalized = normalized.replace(phrase, "")
    return normalized
