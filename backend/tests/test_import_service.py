"""中文说明：覆盖导入预览和重复导入跳过逻辑。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.ai_grading import AiGradingMessage, AiGradingResult
from app.models.ai_question_generation import AiQuestionCandidate, AiQuestionGeneration
from app.models.ai_tutor import AiTutorMessage, AiTutorThread
from app.models.attempt import Attempt
from app.models.import_batch import ImportBatch
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.services.import_service import commit_import, preview_import, reset_and_commit_import


SAMPLE = """
### Part 2-001｜单选题｜基础｜标签
题目：哪项正确？
选项： A. 错 B. 对
标准答案：B
详细解析：B 正确。
"""


def test_preview_import() -> None:
    """中文说明：导入预览只解析不入库。"""

    preview = preview_import(SAMPLE)
    assert preview.success_count == 1
    assert preview.type_distribution["单选题"] == 1


def test_commit_import_skips_duplicate() -> None:
    """中文说明：重复确认导入同一个 part_id 时跳过已有题目。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    first = commit_import(db, SAMPLE)
    second = commit_import(db, SAMPLE)
    assert first.imported_count == 1
    assert second.imported_count == 0
    assert second.skipped_count == 1
    db.close()


def test_reset_and_commit_import_hard_deletes_old_question_data() -> None:
    """中文说明：重置导入会物理清空旧题库、答题、历史和 session。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    commit_import(db, SAMPLE)
    question = db.query(Question).first()
    db.add(Attempt(id="a1", question_id=question.id, user_answer_raw="A"))
    db.add(
        QuestionRevision(
            id="r1",
            question_id=question.id,
            version_before=1,
            version_after=2,
            before_data={},
            after_data={},
            changed_fields=["stem"],
            source="test",
        )
    )
    db.add(PracticeSession(id="s1", mode="sequential", filters_json={}, order="import_order", page_size=20, total=1, current_index=0, question_ids_json=[question.id]))
    db.add(
        AiGradingResult(
            id=1,
            question_id=question.id,
            attempt_id="a1",
            provider="deepseek",
            model="test-model",
            score=7.0,
            max_score=10.0,
            level="合格",
            result_json={},
        )
    )
    db.add(AiGradingMessage(grading_id=1, role="user", content="为什么扣分？"))
    db.add(AiTutorThread(id="t1", question_id=question.id, attempt_id="a1"))
    db.add(AiTutorMessage(id="tm1", thread_id="t1", role="assistant", stage="after_submit", content="讲解"))
    db.add(
        AiQuestionGeneration(
            id="g1",
            source_question_id=question.id,
            attempt_id="a1",
            target_type="single_choice",
            count=1,
            difficulty_strategy="keep",
        )
    )
    db.add(
        AiQuestionCandidate(
            id="c1",
            generation_id="g1",
            candidate_json={},
            structure_validation_json={},
            ai_validation_json={},
            similar_questions_json=[],
        )
    )
    db.commit()
    result = reset_and_commit_import(db, SAMPLE.replace("Part 2-001", "Part 2-002"))
    assert result.imported_count == 1
    assert db.query(Attempt).count() == 0
    assert db.query(QuestionRevision).count() == 0
    assert db.query(PracticeSession).count() == 0
    assert db.query(AiGradingResult).count() == 0
    assert db.query(AiGradingMessage).count() == 0
    assert db.query(AiTutorThread).count() == 0
    assert db.query(AiTutorMessage).count() == 0
    assert db.query(AiQuestionGeneration).count() == 0
    assert db.query(AiQuestionCandidate).count() == 0
    assert db.query(ImportBatch).count() == 1
    assert [item.part_id for item in db.query(Question).all()] == ["Part-2-002"]
    db.close()
