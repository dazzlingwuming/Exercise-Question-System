"""中文说明：覆盖题库列表和稳定练习会话的集合隔离。"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.question import Question
from app.models.question_collection import QuestionCollection, ROOT_COLLECTION_ID
from app.routers.questions import filter_options_api
from app.schemas.practice import PracticeSessionCreate
from app.services.practice_session_service import create_practice_session, get_practice_session
from app.services.question_service import list_questions


def make_question(question_id: str, import_order: int, collection_id: str | None) -> Question:
    """中文说明：构造只包含集合筛选所需字段的题目。"""

    return Question(
        id=question_id,
        part_id=question_id,
        title=question_id,
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=[],
        directions=[],
        import_order=import_order,
        collection_id=collection_id,
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


def make_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    db.add_all(
        [
            QuestionCollection(id=ROOT_COLLECTION_ID, parent_id=None, name="题库", normalized_name="题库", is_system=True),
            QuestionCollection(id="collection-a", parent_id=ROOT_COLLECTION_ID, name="课程 A", normalized_name="课程 a"),
            QuestionCollection(id="collection-b", parent_id=ROOT_COLLECTION_ID, name="书籍 B", normalized_name="书籍 b"),
        ]
    )
    db.add_all(
        [
            make_question("a-1", 1, "collection-a"),
            make_question("a-2", 2, "collection-a"),
            make_question("b-1", 3, "collection-b"),
            make_question("manual-1", 4, None),
        ]
    )
    db.commit()
    return db


def test_question_list_and_filter_options_keep_collections_separate() -> None:
    db = make_db()

    total, items = list_questions(db, 1, 20, collection_id="collection-a")
    options = filter_options_api(db)

    assert total == 2
    assert [item.id for item in items] == ["a-1", "a-2"]
    assert "sources" not in options.model_dump()
    db.close()


def test_practice_session_filters_by_collection_and_keeps_its_snapshot() -> None:
    db = make_db()

    session = create_practice_session(
        db,
        PracticeSessionCreate(mode="sequential", collection_id="collection-a", page_size=20),
    )
    db.add(make_question("a-3", 5, "collection-a"))
    db.commit()
    restored = get_practice_session(db, session.session_id)

    assert [item.id for item in session.items] == ["a-1", "a-2"]
    assert all(item.collection_id == "collection-a" and item.collection_path == "题库 / 课程 A" for item in session.items)
    assert restored is not None
    assert restored.filters["collection_id"] == "collection-a"
    assert restored.total == 2
    assert [item.id for item in restored.current_group] == ["a-1", "a-2"]
    db.close()
