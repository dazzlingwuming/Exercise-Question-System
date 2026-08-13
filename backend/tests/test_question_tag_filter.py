"""中文说明：覆盖 SQLite JSON 多标签筛选，避免只命中单元素标签数组。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.question import Question
from app.services.question_service import get_random_question, list_questions


def make_question(question_id: str, tags: list[str]) -> Question:
    """中文说明：构造列表筛选所需的最小题目。"""

    return Question(
        id=question_id,
        part_id=question_id,
        title=question_id,
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=tags,
        directions=[],
        import_order=1,
        stem=question_id,
        material=None,
        options=[{"key": "A", "text": "正确"}, {"key": "B", "text": "错误"}],
        standard_answer="A",
        answer_text="A",
        explanation="解析",
        exam_points=[],
        common_mistakes=None,
        follow_up_question=None,
        scoring_standard=None,
        source_text="test",
        parse_warnings=[],
        version=1,
    )


def test_tag_filter_matches_a_tag_inside_a_multi_tag_json_array() -> None:
    """中文说明：多标签题按任一精确标签可被列表和随机抽题命中。"""

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add_all([make_question("q-multi", ["Agent", "RAG"]), make_question("q-other", ["安全"])])
    db.commit()

    total, items = list_questions(db, 1, 20, tag="RAG")
    random_item = get_random_question(db, tag="RAG")

    assert total == 1
    assert [item.id for item in items] == ["q-multi"]
    assert random_item is not None and random_item.id == "q-multi"
    db.close()
