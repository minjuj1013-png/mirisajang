"""/api/* 처리. HTTP와 무관하게 (상태코드, 딕셔너리)를 돌려줘서 테스트하기 쉽게 했습니다."""
import json

from lib import calc
from lib.recommend import recommend
from lib.stats import compute_stats
from lib.validate import (ALL_DISTRICT, ApiError, CAPITAL_MAX, CAPITAL_MIN, EDITABLE_FIELDS, STAFF_MAX, STAFF_MIN,
                          validate_estimate, validate_event, validate_feedback, validate_preorder,
                          validate_recommend)

PUBLIC_DEV_SOURCE = "시험용 값 · 아직 근거 자료를 연결하지 않았어요"
PUBLIC_DEV_STATUS = "시험용 가상 값"
INTERNAL_DEV_STATUS = "가상 예시(개발용, 출처 미확인)"


def public_estimate(seed, result):
    """응답 직전에만 거름: trace의 내부 경로(seed_path)를 빼고, 개발용 표기를 사용자용 문구로 바꿉니다.
    내부 seed의 status 규칙·calc 결과는 그대로 둡니다."""
    dev_sources = set(s.get("name") for s in seed["sources"] if s.get("status") == INTERNAL_DEV_STATUS)

    def join_mapped(text, mapping):
        if text is None:
            return None
        out = []
        for part in text.split(" / "):
            part = mapping(part)
            if part not in out:
                out.append(part)
        return " / ".join(out)

    out = dict(result)
    out["trace"] = [{
        "item": t["item"],
        "source_name": join_mapped(t["source_name"], lambda x: PUBLIC_DEV_SOURCE if x in dev_sources else x),
        "year": t["year"],
        "status": join_mapped(t["status"], lambda x: PUBLIC_DEV_STATUS if x == INTERNAL_DEV_STATUS else x),
    } for t in result["trace"]]
    return out


PREORDER_MESSAGE = "사전 신청이 기록됐어요. 아직 결제나 리포트 제공은 하지 않아요."
LOCAL_IPS = ("127.0.0.1", "::1", "::ffff:127.0.0.1")


class Api(object):
    def __init__(self, seed, store):
        self.seed = seed
        self.store = store
        self.routes = {
            "/api/options": {"GET": self.options},
            "/api/estimate": {"POST": self.estimate},
            "/api/recommend": {"POST": self.recommend},
            "/api/events": {"POST": self.events},
            "/api/feedback": {"POST": self.feedback},
            "/api/preorder": {"POST": self.preorder},
            "/api/stats": {"GET": self.stats},
        }

    def dispatch(self, method, path, body_bytes, client_ip):
        if len(path) > 1:
            path = path.rstrip("/")
        methods = self.routes.get(path)
        if methods is None:
            raise ApiError("NOT_FOUND", 404, "찾을 수 없는 주소예요.")
        handler = methods.get(method)
        if handler is None:
            raise ApiError("METHOD_NOT_ALLOWED", 405, "이 주소에서는 쓸 수 없는 방식이에요.")
        if path == "/api/stats" and client_ip not in LOCAL_IPS:
            raise ApiError("FORBIDDEN", 403, "통계는 서버가 켜진 컴퓨터에서만 볼 수 있어요.")
        if method == "POST":
            body = self._parse_json(body_bytes)
            return 200, handler(body)
        return 200, handler()

    @staticmethod
    def _parse_json(raw):
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ApiError("VALIDATION_ERROR", 400, "요청 형식이 올바르지 않아요. JSON으로 보내 주세요.")

    # ---------------- 엔드포인트 ----------------
    def options(self):
        s = self.seed
        mw = s["constants"]["min_wage"]
        return {
            "is_dev_data": bool(s["meta"].get("is_dev_data")),
            "dev_notice": s["meta"].get("dev_notice"),
            "regions": [self._region_option(r) for r in s["regions"]],
            "capital": {"min": CAPITAL_MIN, "max": CAPITAL_MAX, "unit": "만 원"},
            "brands": [{"id": b["id"], "name": b["name"]} for b in s["brands"]],
            "royalty_levels": [{"id": x["id"], "label": x["label"]} for x in s["royalty_levels"]],
            "staff_options": list(range(STAFF_MIN, STAFF_MAX + 1)),
            "editable_fields": [dict(f) for f in EDITABLE_FIELDS],
            "glossary": [dict(g) for g in s["glossary"]],
            "min_wage": {"monthly_won": mw["monthly_won"], "hourly_won": mw["hourly_won"],
                         "basis": mw.get("basis"), "year": mw.get("year"), "status": mw.get("status")},
        }

    @staticmethod
    def _region_option(r):
        """code/name은 이전 화면과의 호환용, value/label/children은 2단계 선택용."""
        children = [{"value": ALL_DISTRICT, "label": "%s 전체" % r["name"]}]
        children += [{"value": d["code"], "label": d["name"]} for d in r.get("districts") or []]
        return {"code": r["code"], "name": r["name"], "value": r["code"], "label": r["name"],
                "accuracy_level": r.get("accuracy_level", 0), "children": children}

    def recommend(self, body):
        inp = validate_recommend(self.seed, body)
        return recommend(self.seed, inp)

    def estimate(self, body):
        inp = validate_estimate(self.seed, body)
        return public_estimate(self.seed, calc.estimate(self.seed, inp))

    def events(self, body):
        sid, name, props = validate_event(body)
        self.store.append("events", sid, name, props)
        return {"ok": True}

    def feedback(self, body):
        sid, ftype, props = validate_feedback(body)
        self.store.append("feedback", sid, ftype, props)
        return {"ok": True}

    def preorder(self, body):
        sid, ctx = validate_preorder(body)
        self.store.append("preorders", sid, "preorder", ctx)
        return {"ok": True, "message": PREORDER_MESSAGE}

    def stats(self):
        return compute_stats(self.store)
