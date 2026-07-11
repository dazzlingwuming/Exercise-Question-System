"""中文说明：集中管理路径、数据库地址和跨域等基础配置。"""

from pathlib import Path
import os


class Settings:
    """中文说明：保存本地运行所需的稳定配置，避免路径散落在各模块。"""

    repository_root: Path = Path(__file__).resolve().parents[2]
    backend_root: Path = repository_root / "backend"
    data_dir: Path = repository_root / "data"
    question_bank_path: Path = repository_root / "data" / "个人题库" / "agent基础题目.md"
    database_url: str = f"sqlite:///{data_dir / 'question_practice.sqlite3'}"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    deepseek_api_key: str | None = os.getenv("DEEPSEEK_API_KEY") or os.getenv("AI_API_KEY")
    deepseek_base_url: str = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    deepseek_grading_model: str = os.getenv("DEEPSEEK_GRADING_MODEL", "deepseek-v4-pro")
    anysearch_enabled: bool = os.getenv("ANYSEARCH_ENABLED", "true").lower() not in {"0", "false", "no", "off"}
    anysearch_api_key: str | None = os.getenv("ANYSEARCH_API_KEY")
    anysearch_endpoint: str = os.getenv("ANYSEARCH_ENDPOINT", "https://api.anysearch.com/mcp")


settings = Settings()
