"""中文说明：覆盖 AI 题目生成读取评分上下文的回归场景。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.attempt import Attempt
from app.models.question import Question
from app.services.llm.ai_question_generation_service import _grading_context


def test_grading_context_uses_a_stable_stage_for_grading_messages() -> None:
    """中文说明：评分追问消息没有 tutor stage 字段，生成题目时也不能崩溃。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add(
        Question(
            id="q1",
            part_id="q1",
            title="系统设计",
            type="system_design",
            type_label="系统设计题",
            difficulty="进阶",
            tags=[],
            directions=[],
            import_order=1,
            stem="设计一个系统",
            material=None,
            options=[],
            standard_answer="参考答案",
            answer_text="参考答案",
            explanation="解析",
            exam_points=[],
            common_mistakes=None,
            follow_up_question=None,
            scoring_standard="评分标准",
            source_text="test",
            parse_warnings=[],
            version=1,
        )
    )
    db.add(Attempt(id="a1", question_id="q1", user_answer_raw="我的回答", review_status="pending", question_snapshot={}))
    db.flush()
    result = AiGradingResult(
        question_id="q1",
        attempt_id="a1",
        provider="deepseek",
        model="test-model",
        score=7.0,
        max_score=10.0,
        level="合格",
        summary="评分摘要",
        result_json={"score": 7.0},
    )
    db.add(result)
    db.flush()
    db.add(AiGradingMessage(grading_id=result.id, role="user", content="为什么扣分？"))
    db.commit()

    context = _grading_context(db, "q1", "a1")

    assert context["summary"] == "评分摘要"
    assert context["messages"] == [{"role": "user", "stage": "grading_chat", "content": "为什么扣分？"}]
    db.close()
