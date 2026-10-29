"""中文说明：FastAPI 应用入口，注册路由、跨域和启动时数据库初始化。"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.services.media_service import MediaError
from app.middleware.media_limit import MediaUploadLimitMiddleware

from app.config import settings
from app.database import init_db
from app.routers import ai, attempts, collections, imports, media, practice, questions, stats, studio

app = FastAPI(title="Agent 应用层岗位题库刷题系统", version="0.1.0")

app.add_middleware(MediaUploadLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """中文说明：应用启动时确保 SQLite 表结构存在。"""

    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    """中文说明：健康检查接口，供前端和人工确认后端运行状态。"""

    return {"status": "ok"}


@app.exception_handler(MediaError)
async def media_error_handler(request, exc: MediaError):
    return JSONResponse(status_code=exc.status_code, content={"detail": {"code": exc.code, "message": exc.message}})


app.include_router(media.router, prefix="/api")
app.include_router(imports.router, prefix="/api")
app.include_router(collections.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(practice.router, prefix="/api")
app.include_router(attempts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(studio.router, prefix="/api")
