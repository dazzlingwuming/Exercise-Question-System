"""中文说明：集中暴露数据库模型，便于数据库初始化时导入。"""

from app.models.attempt import Attempt
from app.models.ai_question_generation import AiQuestionCandidate, AiQuestionGeneration
from app.models.ai_tutor import AiTutorMessage, AiTutorThread
from app.models.import_batch import ImportBatch
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.question_revision import QuestionRevision
from app.models.user_question_state import UserQuestionState

__all__ = [
    "Attempt",
    "AiQuestionCandidate",
    "AiQuestionGeneration",
    "AiTutorMessage",
    "AiTutorThread",
    "ImportBatch",
    "PracticeSession",
    "Question",
    "QuestionRevision",
    "UserQuestionState",
]
