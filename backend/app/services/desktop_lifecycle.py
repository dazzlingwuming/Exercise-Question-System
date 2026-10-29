"""Recovery for the desktop's exclusive, per-library service process."""

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models.studio import StudioConversation, StudioMessage


def recover_interrupted_runs(db: Session) -> None:
    # Called only before the desktop service starts accepting requests. A copied
    # snapshot or a previous crash cannot still own a live generation here.
    db.execute(update(StudioMessage).where(StudioMessage.status == "pending")
               .values(status="stopped", error="上次生成已中断，已保存的内容仍在，可以重试。"))
    db.execute(update(StudioConversation).where(StudioConversation.active_run_id.is_not(None))
               .values(active_run_id=None, run_started_at=None))
    db.commit()
