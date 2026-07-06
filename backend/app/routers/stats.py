"""中文说明：统计 API。"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.stats import StatsSummary
from app.services.stats_service import get_stats_summary

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
def summary_api(db: Session = Depends(get_db)) -> StatsSummary:
    """中文说明：返回题库、答题、正确率和高频错误统计。"""

    return get_stats_summary(db)
