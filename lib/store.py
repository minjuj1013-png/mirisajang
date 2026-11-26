"""기록 저장소: JSONL 파일에 한 줄씩 추가합니다 (DESIGN.md 5-4).

한 줄 = {"ts", "session_id", "name", "props"} 만 저장합니다.
IP, User-Agent, 쿠키는 저장하지 않습니다(애초에 이 모듈에 전달되지 않음).
"""
import json
import os
import threading
from datetime import datetime, timezone

KINDS = ("events", "feedback", "preorders")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class Store(object):
    def __init__(self, directory):
        self.directory = directory
        self._lock = threading.Lock()

    def _path(self, kind):
        if kind not in KINDS:
            raise ValueError("알 수 없는 기록 종류: %s" % kind)
        return os.path.join(self.directory, kind + ".jsonl")

    def append(self, kind, session_id, name, props):
        record = {"ts": now_iso(), "session_id": session_id, "name": name, "props": props}
        line = json.dumps(record, ensure_ascii=False) + "\n"
        with self._lock:
            os.makedirs(self.directory, exist_ok=True)
            with open(self._path(kind), "a", encoding="utf-8") as f:
                f.write(line)
        return record

    def read(self, kind):
        """저장된 기록 목록(오래된 순). 파일이 없거나 깨진 줄은 건너뜁니다."""
        path = self._path(kind)
        with self._lock:
            if not os.path.exists(path):
                return []
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        out = []
        for ln in lines:
            ln = ln.strip()
            if not ln:
                continue
            try:
                rec = json.loads(ln)
            except ValueError:
                continue
            if isinstance(rec, dict):
                out.append(rec)
        return out
