"""Only the owning desktop process can access its loopback service."""

import secrets

from starlette.responses import JSONResponse


class DesktopTokenMiddleware:
    def __init__(self, app, token: str):
        self.app, self.token = app, token

    async def __call__(self, scope, receive, send):
        if self.token and scope["type"] == "http":
            supplied = dict(scope.get("headers", [])).get(b"x-xiaojing-token", b"")
            if not secrets.compare_digest(supplied, self.token.encode("ascii")):
                await JSONResponse({"detail": "仅允许当前桌面客户端访问。"}, status_code=401)(scope, receive, send)
                return
        await self.app(scope, receive, send)
