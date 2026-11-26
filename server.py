#!/usr/bin/env python3
"""미리사장 로컬 서버. 실행: python3 server.py  (Python 3.9 표준 라이브러리만 사용)"""
import errno
import json
import os
import sys
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from lib.api import Api  # noqa: E402
from lib.seed import SeedError, load_seed  # noqa: E402
from lib.store import Store  # noqa: E402
from lib.validate import ApiError  # noqa: E402

HOST = "127.0.0.1"  # 같은 컴퓨터에서만 접속 (0.0.0.0 금지)
DEFAULT_PORT = 8000
MAX_BODY = 10 * 1024
DRAIN_LIMIT = 1024 * 1024

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".txt": "text/plain; charset=utf-8",
}


def resolve_static(public_dir, url_path):
    """URL 경로를 public/ 안의 실제 파일 경로로 바꿉니다. 안전하지 않거나 없으면 None."""
    p = urllib.parse.unquote(url_path)
    if "\x00" in p or "\\" in p or ".." in p:
        return None
    if p in ("/", ""):
        p = "/index.html"
    elif p.rstrip("/") == "/stats":
        p = "/stats.html"
    parts = [seg for seg in p.split("/") if seg]
    if not parts or any(seg.startswith(".") for seg in parts):
        return None
    root = os.path.realpath(public_dir)
    target = os.path.realpath(os.path.join(root, *parts))
    if target != root and not target.startswith(root + os.sep):
        return None
    if not os.path.isfile(target):
        return None
    return target


class Handler(BaseHTTPRequestHandler):
    server_version = "MiriSajang"
    sys_version = ""

    def log_message(self, fmt, *args):  # 접속 기록(IP 등)을 남기지 않음
        pass

    # ---- 응답 보내기 ----
    def _send(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _send_error(self, err):
        self._send_json(err.status, err.to_body())

    # ---- 본문 읽기 ----
    def _read_body(self):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise ApiError("VALIDATION_ERROR", 400, "요청 형식이 올바르지 않아요.")
        if length < 0:
            raise ApiError("VALIDATION_ERROR", 400, "요청 형식이 올바르지 않아요.")
        if length > MAX_BODY:
            # 너무 크면 읽지 않고 거절. 연결이 갑자기 끊기지 않도록 적당한 크기까지는 버리면서 읽음
            remaining = min(length, DRAIN_LIMIT)
            while remaining > 0:
                chunk = self.rfile.read(min(remaining, 65536))
                if not chunk:
                    break
                remaining -= len(chunk)
            self.close_connection = True
            raise ApiError("TOO_LARGE", 413, "보낸 내용이 너무 길어요. (최대 10KB)")
        return self.rfile.read(length) if length else b""

    # ---- 라우팅 ----
    def _handle(self):
        try:
            path = urllib.parse.urlsplit(self.path).path
            method = self.command
            if path == "/api" or path.startswith("/api/"):
                body = self._read_body() if method == "POST" else b""
                status, obj = self.server.api.dispatch(method, path, body, self.client_address[0])
                self._send_json(status, obj)
            elif method in ("GET", "HEAD"):
                target = resolve_static(self.server.public_dir, path)
                if target is None:
                    raise ApiError("NOT_FOUND", 404, "찾을 수 없는 주소예요.")
                with open(target, "rb") as f:
                    data = f.read()
                ctype = CONTENT_TYPES.get(os.path.splitext(target)[1].lower(), "application/octet-stream")
                self._send(200, data, ctype)
            else:
                raise ApiError("METHOD_NOT_ALLOWED", 405, "이 주소에서는 쓸 수 없는 방식이에요.")
        except ApiError as e:
            self._send_error(e)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            traceback.print_exc()  # 상세 내용은 터미널에만
            try:
                self._send_json(500, {"error": {"code": "INTERNAL", "message": "잠시 후 다시 시도해 주세요."}})
            except Exception:
                pass

    do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = do_HEAD = _handle


def make_server(port, seed, store_dir, public_dir):
    """서버 객체를 만듭니다(시작은 serve_forever). 테스트에서도 씁니다."""
    httpd = ThreadingHTTPServer((HOST, port), Handler)
    httpd.daemon_threads = True
    httpd.api = Api(seed, Store(store_dir))
    httpd.public_dir = public_dir
    return httpd


def main():
    seed_path = os.path.join(ROOT, "data", "seed.json")
    try:
        seed, warnings = load_seed(seed_path)
    except SeedError as e:
        print("seed.json에 고쳐야 할 곳이 있어서 서버를 켜지 않았어요.\n")
        for msg in e.errors:
            print("  - " + msg)
        print("\ndata/seed.json을 고친 뒤 다시 실행해 주세요.")
        return 1
    for w in warnings:
        print("[주의] " + w)

    raw_port = os.environ.get("PORT", str(DEFAULT_PORT))
    try:
        port = int(raw_port)
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        print("PORT 값 '%s'이(가) 올바른 번호가 아니에요. 1~65535 사이 숫자를 써 주세요." % raw_port)
        return 1

    try:
        httpd = make_server(port, seed, os.path.join(ROOT, "data", "store"), os.path.join(ROOT, "public"))
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            print("%d번이 이미 사용 중이에요. 다른 터미널 창에서 서버가 켜져 있는지 확인하세요." % port)
            print("다른 번호로 켜려면:  PORT=8001 python3 server.py")
        else:
            print("서버를 켤 수 없었어요: %s" % e)
        return 1

    print("미리사장이 켜졌어요: http://%s:%d" % (HOST, port))
    print("통계 화면: http://%s:%d/stats" % (HOST, port))
    if seed["meta"].get("is_dev_data"):
        print("[안내] 시험용 가상 데이터로 실행 중이에요. 실제 창업 판단에 쓰지 마세요.")
    if not os.path.isdir(os.path.join(ROOT, "public")):
        print("[안내] public 폴더가 아직 없어요. 화면은 안 보이고 /api 주소만 동작해요.")
    print("끄려면 Control + C 를 누르세요.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 껐어요.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
