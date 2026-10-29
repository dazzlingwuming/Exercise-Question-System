from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator, model_validator


class ModelConnection(BaseModel):
    base_url: str = Field(default="https://api.deepseek.com", max_length=500)
    api_key: str = Field(default="", max_length=1000)
    model: str = Field(default="deepseek-flash", min_length=1, max_length=120)
    supports_images: bool = False

    @field_validator("base_url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")
        url = urlsplit(value)
        if url.scheme not in ("http", "https") or not url.hostname or url.username or url.password or url.query or url.fragment or any(char.isspace() for char in value) or "\\" in value:
            raise ValueError("API 地址必须是 http/https 地址，不能包含密钥、查询参数或片段。")
        try:
            _ = url.port
        except ValueError as exc:
            raise ValueError("API 地址中的端口无效。") from exc
        if value.endswith("/chat/completions"):
            raise ValueError("请填写 API 基础地址，不包含 /chat/completions。")
        return value

    @field_validator("api_key", "model")
    @classmethod
    def clean_text(cls, value: str) -> str:
        value = value.strip()
        if "\n" in value or "\r" in value:
            raise ValueError("模型名和密钥不能包含换行。")
        return value

    @model_validator(mode="after")
    def nonempty_model(self):
        if not self.model:
            raise ValueError("请填写模型名称。")
        if not self.api_key.isascii():
            raise ValueError("API Key 包含非英文字符，请重新复制密钥。")
        return self


class ConversationCreate(BaseModel):
    mode: Literal["learn", "explain", "create"] = "learn"


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    pinned: bool | None = None
    archived: bool | None = None

    @field_validator("title")
    @classmethod
    def nonempty_title(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("标题不能为空。")
        return value.strip() if value is not None else None


class StudioSend(BaseModel):
    connection: ModelConnection
    content: str = Field(default="", max_length=20000)
    image_ids: list[str] = Field(default_factory=list, max_length=6)
    retry_message_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")

    @model_validator(mode="after")
    def validate_message(self):
        if self.retry_message_id:
            if self.content.strip() or self.image_ids:
                raise ValueError("重试不能同时发送新内容。")
        elif not self.content.strip() and not self.image_ids:
            raise ValueError("请输入问题或添加图片。")
        return self


class MathRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=300)
    plot: bool = False
    x_min: float = Field(default=-10, ge=-10000, le=10000, allow_inf_nan=False)
    x_max: float = Field(default=10, ge=-10000, le=10000, allow_inf_nan=False)
