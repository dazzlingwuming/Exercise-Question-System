"""Bound multipart request bytes before Starlette spools an upload to disk."""

from fastapi.responses import JSONResponse

from app.services.media_service import MAX_IMAGE_BYTES


class MediaUploadLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") != "POST" or scope.get("path", "").rstrip("/") != "/api/media/images":
            return await self.app(scope, receive, send)
        limit = MAX_IMAGE_BYTES + 64 * 1024  # bounded multipart envelope allowance
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunk = event.get("body", b"")
            if len(body) + len(chunk) > limit:
                response = JSONResponse(status_code=413, content={"detail": {
                    "code": "MEDIA_TOO_LARGE", "message": "图片上传请求过大，单张图片不能超过 5 MiB。"}})
                return await response(scope, receive, send)
            body.extend(chunk)
            if not event.get("more_body", False):
                break
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        return await self.app(scope, bounded_receive, send)
