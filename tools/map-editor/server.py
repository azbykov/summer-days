"""Local map editor for docs/MAP.md research.

Serves the editor and saves places and photo bindings straight into docs/map/.

    python3 tools/map-editor/server.py
    open http://127.0.0.1:8765/
"""

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EDITOR = Path(__file__).resolve().parent
MAP_DIR = ROOT / "docs" / "map"
PHOTOS_DIR = MAP_DIR / "photos"
DATA_FILES = {
    "/api/places": MAP_DIR / "places.json",
    "/api/photo-bindings": MAP_DIR / "photos.json",
}
IMAGE_EXT = {".webp", ".jpg", ".jpeg", ".png"}
PORT = int(os.environ.get("PORT", "8765"))


def version(path):
    return str(path.stat().st_mtime_ns) if path.exists() else "0"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            return self.send_file(EDITOR / "index.html", "text/html; charset=utf-8")
        if self.path == "/api/photos":
            files = sorted(
                str(p.relative_to(PHOTOS_DIR))
                for p in PHOTOS_DIR.rglob("*")
                if p.suffix.lower() in IMAGE_EXT
            )
            return self.send_json(files)
        if self.path in DATA_FILES:
            path = DATA_FILES[self.path]
            data = json.loads(path.read_text()) if path.exists() else []
            return self.send_json(data, version(path))
        return super().do_GET()

    def do_POST(self):
        if self.path not in DATA_FILES:
            return self.send_error(404)
        path = DATA_FILES[self.path]
        # Refuse to overwrite a file changed since this page loaded it (another tab, a manual edit).
        if self.headers.get("X-Base-Version") != version(path):
            return self.send_error(409)
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        data = json.loads(body)
        if not isinstance(data, list):
            return self.send_error(400)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
        self.send_json({"ok": True}, version(path))

    def send_json(self, data, data_version=None):
        self.send_bytes(json.dumps(data, ensure_ascii=False).encode(), "application/json; charset=utf-8", data_version)

    def send_file(self, path, content_type):
        self.send_bytes(path.read_bytes(), content_type)

    def send_bytes(self, payload, content_type, data_version=None):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        if data_version is not None:
            self.send_header("X-Version", data_version)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    print(f"Map editor: http://127.0.0.1:{PORT}/")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
