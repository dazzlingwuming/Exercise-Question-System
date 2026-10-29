"""Build on the destination OS/architecture; never package the working data directory."""
from pathlib import Path
import os
import subprocess
import sys

desktop = Path(__file__).resolve().parents[1]
root = desktop.parent
output = desktop / "build"
output.mkdir(exist_ok=True)
command = [sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir", "--noupx",
           "--name", "xiaojing-backend", "--distpath", str(output / "backend"),
           "--workpath", str(output / "work"), "--specpath", str(output),
           "--paths", str(root / "backend"), "--collect-submodules", "app",
           "--hidden-import", "uvicorn.logging", "--hidden-import", "uvicorn.loops.asyncio",
           "--hidden-import", "uvicorn.protocols.http.h11_impl", "--hidden-import", "uvicorn.lifespan.on",
           "--add-data", str(root / "data/个人题库/agent基础题目.md") + ":seed",
           str(root / "backend/desktop_entry.py")]
environment = dict(os.environ)
# A venv made from Conda still uses Conda's native libraries. Resolve against the
# interpreter's own DLLs before unrelated Python/OpenSSL installations on PATH.
conda_libraries = Path(sys.base_prefix) / "Library/bin"
if (Path(sys.base_prefix) / "conda-meta").is_dir() and conda_libraries.is_dir():
    environment["PATH"] = str(conda_libraries) + os.pathsep + environment.get("PATH", "")
subprocess.run(command, cwd=root / "backend", env=environment, check=True)
if sys.platform == "darwin":
    # Package the existing avatar at the dimensions required by Apple's icon
    # container. sips is supplied by macOS; no new artwork or network asset.
    subprocess.run(["sips", "-z", "1024", "1024",
                    str(root / "frontend/public/mascot/xiaojing-avatar.png"),
                    "--out", str(desktop / "resources/icon.png")], check=True)
