"""Packaged loopback service and library utilities for the desktop shell."""

import argparse
import asyncio
import json
import os
from pathlib import Path
import socket
import sys
import threading


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect-library", type=Path)
    parser.add_argument("--copy-library", type=Path, nargs=2)
    args = parser.parse_args()
    if args.inspect_library or args.copy_library:
        from app.services.library_transfer import copy_library, inspect_library
        try:
            result = inspect_library(args.inspect_library) if args.inspect_library else copy_library(*args.copy_library)
            print(json.dumps({"ok": True, **result}, ensure_ascii=False), flush=True)
        except Exception as exc:
            print(json.dumps({"ok": False, "message": str(exc)}, ensure_ascii=False), flush=True)
            raise SystemExit(1)
        return
    if len(os.environ.get("EXERCISE_DESKTOP_TOKEN", "")) < 32 or not os.environ.get("EXERCISE_DATA_DIR"):
        raise SystemExit("Desktop startup requires a private token and a data directory.")
    if getattr(sys, "frozen", False):
        os.environ["EXERCISE_DEFAULT_BANK"] = str(Path(sys._MEIPASS) / "seed/agent基础题目.md")

    import uvicorn
    from app.main import app

    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    port = listener.getsockname()[1]

    class DesktopServer(uvicorn.Server):
        async def startup(self, sockets=None):
            await super().startup(sockets=sockets)
            if not self.should_exit:
                from app.database import SessionLocal
                from app.services.desktop_lifecycle import recover_interrupted_runs
                with SessionLocal() as db:
                    recover_interrupted_runs(db)
                print(json.dumps({"type": "ready", "port": port}), flush=True)

    server = DesktopServer(uvicorn.Config(app, host="127.0.0.1", port=port, loop="asyncio", http="h11", ws="none", log_level="warning", access_log=False, timeout_graceful_shutdown=3))

    def parent_watch():
        # EOF arrives even if the shell crashes. No permanent orphan service.
        try:
            while sys.stdin.buffer.read(1):
                pass
        finally:
            server.should_exit = True

    threading.Thread(target=parent_watch, daemon=True).start()
    try:
        asyncio.run(server.serve(sockets=[listener]))
    finally:
        listener.close()


if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    main()
