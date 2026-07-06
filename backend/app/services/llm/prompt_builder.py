"""中文说明：根据题目、提交状态和阶段构造 AI 讲题 prompt。"""

from __future__ import annotations

import json

from app.models.attempt import Attempt
from app.models.question import Question


def build_messages(
    *,
    question: Question,
    attempt: Attempt | None,
    submitted: bool,
    stage: str,
    user_content: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:
    system = _system_prompt(stage, submitted)
    context = _question_context(question, attempt, submitted)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": "当前题目上下文：\n" + json.dumps(context, ensure_ascii=False, indent=2)},
    ]
    messages.extend(history[-12:])
    messages.append({"role": "user", "content": user_content})
    return messages


def _question_context(question: Question, attempt: Attempt | None, submitted: bool) -> dict[str, object]:
    base: dict[str, object] = {
        "question_id": question.id,
        "type": question.type,
        "type_label": question.type_label,
        "difficulty": question.difficulty,
        "module": (question.directions or question.tags or [None])[0],
        "knowledge_points": question.exam_points,
        "stem": question.stem,
        "material": question.material,
        "options": question.options,
        "submitted": submitted,
    }
    if submitted:
        base.update(
            {
                "standard_answer": question.standard_answer,
                "explanation": question.explanation,
                "scoring_standard": question.scoring_standard,
                "common_mistakes": question.common_mistakes,
                "follow_up_question": question.follow_up_question,
                "user_answer": attempt.user_answer_raw if attempt else None,
                "is_correct": attempt.is_correct if attempt else None,
            }
        )
    return base


def _system_prompt(stage: str, submitted: bool) -> str:
    if not submitted:
        return (
            "你是一个面向 Agent 应用层岗位题库的 AI 讲题助手。当前用户还没有提交本题答案。"
            "你只能给解题提示、概念解释和题干理解帮助，不能泄露正确答案，不能直接说应该选择哪个选项，"
            "不能输出标准答案或完整解析。使用中文，不超过 200 字。"
        )
    if stage == "explanation":
        return (
            "你是一个 Agent 应用层岗位题库的 AI 讲题助手。当前用户已经提交本题答案。"
            "请按结构输出：## 这题考什么 ## 标准思路 ## 你的答案分析 ## 背后的原理 ## 推荐补充表达 ## 一句话记忆。"
            "以题库标准答案为主要依据，不要编造无关信息。"
        )
    if stage == "engineering_example":
        return (
            "你是一个 Agent 工程面试辅导助手。请基于当前题目、标准答案和用户答案给出一个具体工程例子。"
            "按结构输出：## 工程场景 ## 为什么这个场景对应本题 ## 方案落地 ## 可能的问题 ## 面试表达。"
        )
    if stage == "interview_followup":
        return (
            "你是一个 Agent 应用层岗位面试官。请基于当前题目生成 1 个贴合本题的面试追问，"
            "不要生成多个追问。输出结构包含：问题、考察点、回答要点。"
        )
    return "你是一个题目感知型 AI 讲题助手。请只围绕当前题目回答，使用中文，避免无关扩展。"
