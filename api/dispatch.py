"""Vercel Functions entry point for the existing simulator API."""
import json
import traceback
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from uuid import uuid4

from lib.api import Api
from lib.seed import load_seed
from lib.store import now_iso
from lib.validate import ApiError
from server import Handler


class BlobStore:
    def append(self, kind, session_id, name, props):
        from vercel.blob import BlobClient

        record = {"ts": now_iso(), "session_id": session_id, "name": name, "props": props}
        BlobClient().put(
            f"records/{kind}/{uuid4().hex}.json",
            json.dumps(record, ensure_ascii=False).encode("utf-8"),
            access="private",
            content_type="application/json",
        )
        return record


seed, _ = load_seed(Path(__file__).resolve().parents[1] / "data" / "seed.json")
api = Api(seed, BlobStore())


class handler(Handler):
    def _handle(self):
        try:
            request = urlsplit(self.path)
            path = request.path.rstrip("/")
            if path == "/api/dispatch":
                operation, = parse_qs(request.query).get("operation", [""])[:1]
                path = f"/api/{operation}"
            body = self._read_body() if self.command == "POST" else b""
            status, result = api.dispatch(self.command, path, body, "hosted")
            self._send_json(status, result)
        except ApiError as error:
            self._send_error(error)
        except Exception:
            traceback.print_exc()
            self._send_json(500, {"error": {"code": "INTERNAL", "message": "잠시 후 다시 시도해 주세요."}})

    do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = do_HEAD = _handle
