"""Session-specific progress and recovery; never confuse old attempts with this run."""

from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session, load_only

from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.schemas.attempt import SubmitAnswerResponse


def latest_session_attempts(db: Session, session_id: str, include_content: bool = True) -> list[Attempt]:
    ranked = select(Attempt.id, func.row_number().over(
        partition_by=Attempt.question_id, order_by=(Attempt.created_at.desc(), Attempt.id.desc()),
    ).label("rank")).where(Attempt.practice_session_id == session_id).subquery()
    query = select(Attempt).join(ranked, ranked.c.id == Attempt.id).where(ranked.c.rank == 1)
    if not include_content:
        query = query.options(load_only(Attempt.id, Attempt.question_id, Attempt.review_status, Attempt.is_correct))
    return list(db.scalars(query).all())


def session_report(db: Session, session: PracticeSession) -> dict:
    ids = session.question_ids_json or []
    attempts = {a.question_id: a for a in latest_session_attempts(db, session.id, include_content=False)}
    # Select only metadata: reports don't need to deserialize every question's content.
    questions = {q.id: q for q in db.execute(select(
        Question.id, Question.title, Question.stem, Question.is_deleted, Question.exam_points,
    ).where(Question.id.in_(ids)))}
    counts = Counter()
    weak_points = Counter()
    items = []
    for index, question_id in enumerate(ids):
        q = questions.get(question_id)
        a = attempts.get(question_id)
        if not q or q.is_deleted:
            status = "deleted"
        elif not a:
            status = "unanswered"
        elif a.review_status == "pending":
            status = "pending"
        elif a.review_status == "partial":
            status = "partial"
        else:
            status = "correct" if a.is_correct else "wrong"
        counts[status] += 1
        if status in {"wrong", "partial"}:
            weak_points.update(q.exam_points or [])
        title = (q.title if q.title and not q.title.startswith("Manual-") else q.stem[:100]) if q else "题目已删除"
        items.append({"question_id": question_id, "index": index, "title": title, "status": status})
    answered = sum(counts[s] for s in ("correct", "wrong", "partial", "pending"))
    graded = answered - counts["pending"]
    return {"session_id": session.id, "total": len(ids), "answered": answered,
            "correct": counts["correct"], "wrong": counts["wrong"], "partial": counts["partial"],
            "pending": counts["pending"], "unanswered": counts["unanswered"], "deleted": counts["deleted"],
            "accuracy": round(counts["correct"] / graded * 100) if graded else None,
            "weak_points": [{"point": p, "count": n} for p, n in weak_points.most_common(5)], "items": items}


def session_answers(db: Session, session: PracticeSession) -> list[dict]:
    answers = []
    for attempt in latest_session_attempts(db, session.id):
        if attempt.question_id not in session.question_ids_json:
            continue
        # Saved content belongs to the version actually answered, not the edited live question.
        snapshot = attempt.question_snapshot or {}
        answer = attempt.user_answer_normalized if snapshot.get("type") == "multiple_choice" else attempt.user_answer_raw
        answers.append({"question_id": attempt.question_id, "answer": answer,
            "result": SubmitAnswerResponse(
                attempt_id=attempt.id, is_correct=attempt.is_correct,
                requires_self_review=attempt.review_status == "pending",
                normalized_user_answer=attempt.user_answer_normalized,
                correct_answer_normalized=attempt.correct_answer_normalized,
                **{key: snapshot.get(key) for key in ("standard_answer", "explanation", "common_mistakes", "follow_up_question", "scoring_standard")},
                exam_points=snapshot.get("exam_points") or [],
            ).model_dump()})
    return answers
