"""集合迁移对既有来源、题目和批次的幂等映射。"""

import sqlite3

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import database
from app.database import Base
from app.models.import_batch import ImportBatch
from app.models.question import Question
from app.models.question_collection import ROOT_COLLECTION_ID, UNFILED_COLLECTION_ID, QuestionCollection
from app.models.question_source import QuestionSource


def make_question(question_id: str, source_id: str | None) -> Question:
    return Question(
        id=question_id,
        part_id=question_id,
        title=question_id,
        type="single_choice",
        type_label="单选题",
        difficulty="基础",
        tags=[],
        directions=[],
        import_order=1,
        source_id=source_id,
        stem=question_id,
        material=None,
        options=[{"key": "A", "text": "A"}],
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


def test_backfill_maps_sources_to_same_id_and_nulls_to_unfiled(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    db.add(QuestionSource(id="source-a", name="课程 A", normalized_name="课程 a"))
    db.add_all([make_question("q-source", "source-a"), make_question("q-unfiled", None)])
    db.add_all(
        [
            ImportBatch(id="batch-source", source_name="课程 A", source_id="source-a", collection_id=None),
            ImportBatch(id="batch-unfiled", source_name="粘贴", source_id=None, collection_id=None),
        ]
    )
    db.commit()
    monkeypatch.setattr(database, "engine", engine)
    database.backfill_question_collections()
    database.backfill_question_collections()
    assert db.get(QuestionCollection, ROOT_COLLECTION_ID).is_system is True
    assert db.get(QuestionCollection, UNFILED_COLLECTION_ID).is_system is True
    collection = db.get(QuestionCollection, "source-a")
    assert collection.name == "课程 A"
    assert db.get(Question, "q-source").collection_id == "source-a"
    assert db.get(Question, "q-unfiled").collection_id == UNFILED_COLLECTION_ID
    batches = dict(db.execute(select(ImportBatch.id, ImportBatch.collection_id)).all())
    assert batches == {"batch-source": "source-a", "batch-unfiled": UNFILED_COLLECTION_ID}


def test_backup_uses_pre_migration_name_and_is_readable(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "legacy.sqlite3"
    connection = sqlite3.connect(database_path)
    connection.execute("CREATE TABLE legacy_questions (id TEXT PRIMARY KEY)")
    connection.execute("INSERT INTO legacy_questions (id) VALUES ('q1')")
    connection.commit()
    connection.close()
    test_engine = create_engine(f"sqlite:///{database_path}")
    monkeypatch.setattr(database, "engine", test_engine)

    database._backup_before_collection_migration()

    backups = list(tmp_path.glob("legacy.before_collections_*.sqlite3"))
    assert len(backups) == 1
    backup = sqlite3.connect(backups[0])
    assert backup.execute("SELECT id FROM legacy_questions").fetchone() == ("q1",)
    backup.close()


def test_already_migrated_database_gets_honest_safety_backup(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "partial.sqlite3"
    connection = sqlite3.connect(database_path)
    connection.execute("CREATE TABLE question_collections (id TEXT PRIMARY KEY)")
    connection.commit()
    connection.close()
    test_engine = create_engine(f"sqlite:///{database_path}")
    monkeypatch.setattr(database, "engine", test_engine)

    database._backup_before_collection_migration()
    database._backup_before_collection_migration()

    assert len(list(tmp_path.glob("partial.collections_safety_*.sqlite3"))) == 1
