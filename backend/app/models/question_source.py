"""中文说明：定义可长期复用的题目业务来源。"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QuestionSource(Base):
    """中文说明：课程、论文、书籍或专题等稳定题目来源，不等同于一次导入操作。"""

    __tablename__ = "question_sources"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    questions: Mapped[list["Question"]] = relationship(back_populates="source")
    import_batches: Mapped[list["ImportBatch"]] = relationship(back_populates="source")
