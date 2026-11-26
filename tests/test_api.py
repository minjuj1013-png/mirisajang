import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402
from lib.seed import BANNED_WORDS, load_seed  # noqa: E402

SEED, _ = load_seed(os.path.join(ROOT, "data", "seed.json"))
SID = "sess-aaaa-1111"
SID2 = "sess-bbbb-2222"


class ApiTestCase(unittest.TestCase):
    with_public = True

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="miri_test_")
        self.store_dir = os.path.join(self.tmp, "store")
        self.public_dir = os.path.join(self.tmp, "public")
        if self.with_public:
            os.makedirs(self.public_dir)
            with open(os.path.join(self.public_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write("<!doctype html><title>t</title>")
            with open(os.path.join(self.public_dir, "stats.html"), "w", encoding="utf-8") as f:
                f.write("<!doctype html><title>s</title>")
        # 폴더 밖에 비밀 파일을 두고 새어 나가지 않는지 확인
        with open(os.path.join(self.tmp, "secret.txt"), "w", encoding="utf-8") as f:
            f.write("TOP-SECRET")
        self.httpd = server.make_server(0, SEED, self.store_dir, self.public_dir)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, kwargs={"poll_interval": 0.02}, daemon=True)
        self.thread.start()
        self.seen_texts = []

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def request(self, method, path, body=None, raw=None, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        hdrs = dict(headers or {})
        payload = None
        if raw is not None:
            payload = raw
        elif body is not None:
            payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
            hdrs["Content-Type"] = "application/json"
        conn.request(method, path, body=payload, headers=hdrs)
        resp = conn.getresponse()
        data = resp.read()
        ctype = resp.getheader("Content-Type")
        conn.close()
        text = data.decode("utf-8")
        self.seen_texts.append(text)
        for w in BANNED_WORDS:
            self.assertNotIn(w, text)
        return resp.status, ctype, text

    def api(self, method, path, body=None, raw=None):
        status, ctype, text = self.request(method, path, body, raw)
        self.assertIn("application/json", ctype)
        self.assertIn("utf-8", ctype)
        return status, json.loads(text)

    def post(self, path, body):
        return self.api("POST", path, body)

    def lines(self, kind):
        p = os.path.join(self.store_dir, kind + ".jsonl")
        if not os.path.exists(p):
            return []
        with open(p, encoding="utf-8") as f:
            return [json.loads(x) for x in f if x.strip()]

    def stored_text(self):
        out = ""
        if os.path.isdir(self.store_dir):
            for n in os.listdir(self.store_dir):
                with open(os.path.join(self.store_dir, n), encoding="utf-8") as f:
                    out += f.read()
        return out


class OptionsAndEstimateTests(ApiTestCase):
    def test_options(self):
        status, o = self.api("GET", "/api/options")
        self.assertEqual(status, 200)
        self.assertTrue(o["is_dev_data"])
        self.assertEqual(len(o["regions"]), 17)
        self.assertEqual(set(o["regions"][0].keys()),
                         {"code", "name", "value", "label", "accuracy_level", "children"})
        self.assertEqual(len(o["brands"]), 8)
        self.assertEqual(set(o["brands"][0].keys()), {"id", "name"})
        self.assertEqual([x["id"] for x in o["royalty_levels"]], ["low", "mid", "high"])
        self.assertEqual(o["staff_options"], list(range(1, 11)))
        self.assertEqual([f["key"] for f in o["editable_fields"]],
                         ["monthly_sales", "rent", "cogs_rate", "wage_per_staff"])
        self.assertEqual(o["min_wage"]["monthly_won"], 2156880)
        self.assertEqual(o["min_wage"]["status"], "조건부")
        # 숫자 값(임대료·로열티)은 보내지 않음
        text = json.dumps(o, ensure_ascii=False)
        for key in ("rent_monthly", "sales_monthly", "royalty_rate", "total_fee_rate", "margin_rate"):
            self.assertNotIn(key, text)

    def test_estimate_ok(self):
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "royalty_level": "mid"})
        self.assertEqual(status, 200)
        self.assertEqual(r["status"], "ok")
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-281, 919))
        self.assertEqual((r["breakeven"]["low"], r["breakeven"]["high"]), (1108, 2040))
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (431, 561))
        self.assertEqual(r["profit"]["unit"], "만 원")
        self.assertEqual(r["breakeven"]["basis"], "월 매출")

    def test_estimate_override_example(self):
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "royalty_level": "mid",
                                                "overrides": {"cogs_rate": 35}})
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-206, 794))
        self.assertEqual((r["breakeven"]["low"], r["breakeven"]["high"]), (1198, 1862))
        self.assertEqual(r["overridden"], ["cogs_rate"])

    def test_estimate_brand(self):
        status, r = self.post("/api/estimate", {"region": "gyeonggi", "staff": 1, "brand_id": "brand_a"})
        self.assertEqual(status, 200)
        self.assertEqual(r["status"], "ok")

    def test_estimate_insufficient(self):
        status, r = self.post("/api/estimate", {"region": "busan", "staff": 2, "royalty_level": "mid"})
        self.assertEqual(status, 200)
        self.assertEqual(r["status"], "insufficient")
        self.assertIsNone(r["profit"])
        self.assertIsNone(r["breakeven"])
        self.assertEqual(r["missing"], ["월 매출", "월 임대료"])
        self.assertEqual(r["accuracy"]["label"], "자료 부족")
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "brand_id": "brand_d"})
        self.assertEqual(r["status"], "insufficient")

    def test_estimate_no_free_leak(self):
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "royalty_level": "mid"})
        text = json.dumps(r, ensure_ascii=False)
        for key in ("rent", "royalty", "rent_monthly", "sales_monthly", "total_fee_rate"):
            self.assertNotIn('"%s"' % key, text)
        # seed_path는 경로 글자일 뿐 값이 아님
        for t in r["trace"]:
            self.assertNotIn("value", t)
            self.assertNotIn("low", t)

    def test_estimate_missing_inputs(self):
        status, r = self.post("/api/estimate", {})
        self.assertEqual(status, 400)
        self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(r["error"]["fields"]["region"], "지역을 골라 주세요.")
        self.assertEqual(r["error"]["fields"]["staff"], "일하는 사람 수를 골라 주세요. 사장님을 포함해서 1명 이상이에요.")
        self.assertIn("brand_or_level", r["error"]["fields"])

    def test_estimate_both_brand_and_level(self):
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 1,
                                                "brand_id": "brand_a", "royalty_level": "mid"})
        self.assertEqual(status, 400)
        self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")

    def test_estimate_unknown_option(self):
        status, r = self.post("/api/estimate", {"region": "narnia", "staff": 1, "royalty_level": "mid"})
        self.assertEqual(status, 400)
        self.assertEqual(r["error"]["code"], "UNKNOWN_OPTION")
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 1, "brand_id": "brand_zzz"})
        self.assertEqual(r["error"]["code"], "UNKNOWN_OPTION")

    def test_estimate_staff_owner_included_and_range(self):
        msg = "일하는 사람 수를 골라 주세요. 사장님을 포함해서 1명 이상이에요."
        for empty in (0, None, ""):
            status, r = self.post("/api/estimate", {"region": "seoul", "staff": empty, "royalty_level": "mid"})
            self.assertEqual(status, 400, empty)
            self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")
            self.assertEqual(r["error"]["fields"]["staff"], msg)
        status, r = self.post("/api/estimate", {"region": "seoul", "royalty_level": "mid"})
        self.assertEqual(r["error"]["fields"]["staff"], msg)
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 1, "royalty_level": "mid"})
        self.assertEqual(status, 200)
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (215, 281))
        self.assertTrue(r["labor"]["includes_owner"])
        self.assertIn("사장님", r["labor"]["owner_note"])
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 10, "royalty_level": "mid"})
        self.assertEqual(status, 200)
        for bad in (11, -1, 1.5, "2", True):
            status, r = self.post("/api/estimate", {"region": "seoul", "staff": bad, "royalty_level": "mid"})
            self.assertEqual(status, 400, bad)
            self.assertIn("staff", r["error"]["fields"])

    def test_estimate_override_validation(self):
        base = {"region": "seoul", "staff": 1, "royalty_level": "mid"}
        status, r = self.post("/api/estimate", dict(base, overrides={"cogs_rate": 95}))
        self.assertEqual(status, 400)
        self.assertIn("overrides.cogs_rate", r["error"]["fields"])
        status, r = self.post("/api/estimate", dict(base, overrides={"rent": "abc"}))
        self.assertEqual(status, 400)
        status, r = self.post("/api/estimate", dict(base, overrides={"hacker": 1}))
        self.assertEqual(status, 400)
        status, r = self.post("/api/estimate", dict(base, overrides={"rent": None, "cogs_rate": 35}))
        self.assertEqual(status, 200)
        self.assertEqual(r["overridden"], ["cogs_rate"])

    def test_bad_json(self):
        status, r = self.api("POST", "/api/estimate", raw=b"{not json")
        self.assertEqual(status, 400)
        self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")
        status, r = self.api("POST", "/api/estimate", raw=b"[1,2]")
        self.assertEqual(status, 400)

    def test_not_found_and_method(self):
        status, r = self.api("GET", "/api/nothing")
        self.assertEqual(status, 404)
        self.assertEqual(r["error"]["code"], "NOT_FOUND")
        status, r = self.api("GET", "/api/estimate")
        self.assertEqual(status, 405)

    def test_too_large(self):
        status, r = self.api("POST", "/api/events", raw=b"x" * 11000)
        self.assertEqual(status, 413)
        self.assertEqual(r["error"]["code"], "TOO_LARGE")

    def test_no_banned_phrases_anywhere(self):
        self.api("GET", "/api/options")
        for body in ({"region": "seoul", "staff": 2, "royalty_level": "mid"},
                     {"region": "busan", "staff": 2, "brand_id": "brand_d"}, {}):
            self.post("/api/estimate", body)
        self.api("GET", "/api/stats")
        self.assertGreaterEqual(len(self.seen_texts), 5)  # request()가 매 응답마다 검사함
        for t in self.seen_texts:
            for w in BANNED_WORDS:
                self.assertNotIn(w, t)


class RecordingTests(ApiTestCase):
    def test_events_ok_and_whitelist(self):
        status, r = self.post("/api/events", {"session_id": SID, "name": "result_viewed",
                                              "props": {"region": "seoul", "choice": "royalty_level",
                                                        "status": "ok", "email": "a@b.com", "x": 1}})
        self.assertEqual((status, r), (200, {"ok": True}))
        rec = self.lines("events")[0]
        self.assertEqual(set(rec.keys()), {"ts", "session_id", "name", "props"})
        self.assertEqual(rec["props"], {"region": "seoul", "choice": "royalty_level", "status": "ok"})

    def test_events_validation(self):
        status, r = self.post("/api/events", {"session_id": SID, "name": "hack"})
        self.assertEqual(status, 400)
        status, r = self.post("/api/events", {"name": "page_view", "props": {"screen": "s1"}})
        self.assertEqual(status, 400)
        self.assertIn("session_id", r["error"]["fields"])
        status, r = self.post("/api/events", {"session_id": SID, "name": "page_view",
                                              "props": {"screen": "x" * 60}})
        self.assertEqual(status, 400)
        self.assertEqual(self.lines("events"), [])

    def test_all_event_names_accepted(self):
        for name in ("page_view", "input_started", "field_set", "input_error", "result_viewed",
                     "override_changed", "glossary_opened", "sample_viewed", "preorder_clicked",
                     "recommend_viewed", "brand_picked", "premium_viewed", "premium_compare_viewed"):
            status, _ = self.post("/api/events", {"session_id": SID, "name": name})
            self.assertEqual(status, 200, name)
        status, _ = self.post("/api/events", {"session_id": SID, "name": "input_error",
                                              "props": {"fields": ["region", "staff"]}})
        self.assertEqual(status, 200)
        self.assertEqual(self.lines("events")[-1]["props"], {"fields": ["region", "staff"]})

    def test_feedback_masks_personal_info(self):
        text = "전화 010-1234-5678, 주민 900101-1234567, 계좌 110-123-456789, me@test.com 이에요"
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "blocked",
                                                "screen": "result", "text": text})
        self.assertEqual(status, 200)
        stored = self.lines("feedback")[0]["props"]["text"]
        for secret in ("010-1234-5678", "900101", "1234567", "110-123", "456789", "me@test.com", "@"):
            self.assertNotIn(secret, stored)
        self.assertEqual(stored.count("[가림]"), 4)
        self.assertNotIn("010-1234-5678", self.stored_text())

    def test_no_email_collected_and_no_ip_or_agent(self):
        self.post("/api/preorder", {"session_id": SID, "email": "me@test.com", "name": "홍길동",
                                    "context": {"region": "seoul", "choice": "brand", "email": "x@y.com"}})
        self.post("/api/events", {"session_id": SID, "name": "page_view", "props": {"screen": "s3"}})
        text = self.stored_text()
        self.assertNotIn("@", text)
        self.assertNotIn("홍길동", text)
        self.assertNotIn("127.0.0.1", text)
        self.assertNotIn("Python", text)
        for kind in ("events", "preorders"):
            for rec in self.lines(kind):
                self.assertEqual(set(rec.keys()), {"ts", "session_id", "name", "props"})

    def test_email_in_prop_value_is_masked(self):
        self.post("/api/events", {"session_id": SID, "name": "glossary_opened",
                                  "props": {"term": "a@b.com"}})
        self.assertNotIn("@", self.stored_text())

    def test_feedback_validation(self):
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "similarity", "answer": "great"})
        self.assertEqual(status, 400)
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "blocked", "text": "x" * 501})
        self.assertEqual(status, 400)
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "blocked", "text": "   "})
        self.assertEqual(status, 400)
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "similarity",
                                                "answer": "similar", "respondent": "alien"})
        self.assertEqual(status, 400)
        status, r = self.post("/api/feedback", {"session_id": SID, "type": "blocked", "text": "x" * 500})
        self.assertEqual(status, 200)

    def test_preorder(self):
        status, r = self.post("/api/preorder", {"session_id": SID, "context": {"region": "seoul", "choice": "brand"}})
        self.assertEqual(status, 200)
        self.assertTrue(r["ok"])
        self.assertEqual(r["message"], "사전 신청이 기록됐어요. 아직 결제나 리포트 제공은 하지 않아요.")
        self.assertEqual(len(self.lines("preorders")), 1)
        status, r = self.post("/api/preorder", {})
        self.assertEqual(status, 400)


class StatsTests(ApiTestCase):
    def test_empty_stats(self):
        status, s = self.api("GET", "/api/stats")
        self.assertEqual(status, 200)
        self.assertEqual(s["m1_completed_sessions"], 0)
        self.assertEqual(s["m2_preorder_sessions"], 0)
        self.assertIsNone(s["m2_rate_of_m1"])
        self.assertIsNone(s["m3_rate"])
        self.assertEqual(s["blocked_reports"], [])

    def test_metrics_dedupe_and_definitions(self):
        # 같은 세션이 값을 5번 고치고 결과도 여러 번 → (1)은 1
        self.post("/api/events", {"session_id": SID, "name": "input_started"})
        for _ in range(3):
            self.post("/api/events", {"session_id": SID, "name": "result_viewed",
                                      "props": {"region": "seoul", "choice": "brand", "status": "ok"}})
        for _ in range(5):
            self.post("/api/events", {"session_id": SID, "name": "override_changed", "props": {"field": "rent"}})
        # 두 번째 세션: 입력만 하다가 이탈 (마지막 항목 staff)
        self.post("/api/events", {"session_id": SID2, "name": "input_started"})
        self.post("/api/events", {"session_id": SID2, "name": "field_set", "props": {"field": "region"}})
        self.post("/api/events", {"session_id": SID2, "name": "field_set", "props": {"field": "staff"}})
        self.post("/api/events", {"session_id": SID2, "name": "input_error", "props": {"fields": ["brand_or_level"]}})
        # 사전 신청: 같은 세션 3번 클릭 → 1
        for _ in range(3):
            self.post("/api/preorder", {"session_id": SID})
        # 비슷했나요: SID는 처음 unknown 이후 similar로 바꿈 → 마지막 응답만 집계
        self.post("/api/feedback", {"session_id": SID, "type": "similarity", "answer": "unknown"})
        self.post("/api/feedback", {"session_id": SID, "type": "similarity", "answer": "similar",
                                    "respondent": "operating"})
        self.post("/api/feedback", {"session_id": SID2, "type": "similarity", "answer": "unknown"})
        self.post("/api/feedback", {"session_id": "sess-cccc-3333", "type": "similarity",
                                    "answer": "very_different", "respondent": "preparing"})
        self.post("/api/feedback", {"session_id": SID2, "type": "blocked", "screen": "result",
                                    "text": "임대료를 어디서 고치는지 몰랐어요"})

        status, s = self.api("GET", "/api/stats")
        self.assertEqual(s["m1_completed_sessions"], 1)
        self.assertEqual(s["m2_preorder_sessions"], 1)
        self.assertEqual(s["m2_rate_of_m1"], 1.0)
        self.assertEqual(s["m3_answered"], 3)
        self.assertEqual(s["m3_answered_excl_unknown"], 2)
        self.assertEqual(s["m3_similar"], 1)
        self.assertEqual(s["m3_rate"], 0.5)
        self.assertEqual(s["m3_by_respondent"]["operating"]["similar"], 1)
        self.assertEqual(s["m3_by_respondent"]["operating"]["answered_excl_unknown"], 1)
        self.assertEqual(s["m3_by_respondent"]["preparing"]["answered_excl_unknown"], 1)
        self.assertEqual(s["funnel"], {"input_started": 2, "input_error": 1, "result_viewed": 1})
        self.assertEqual(s["dropoff_last_field"]["staff"], 1)
        self.assertEqual(s["dropoff_last_field"]["region"], 0)
        self.assertEqual(len(s["blocked_reports"]), 1)
        self.assertEqual(s["blocked_reports"][0]["screen"], "result")
        self.assertIsNotNone(s["period"]["from"])


class RecommendTests(ApiTestCase):
    CAP_MSG = "보유 자본을 만 원 단위로 적어 주세요(500~100,000)."

    def rec(self, **kw):
        body = {"capital": 12000, "region": "seoul", "staff": 2}
        body.update(kw)
        return self.post("/api/recommend", body)

    def test_capital_validation(self):
        for bad in (None, "", 499, 100001, 0, -5, 1000.5, "5000", True, [1]):
            status, r = self.rec(capital=bad)
            self.assertEqual(status, 400, bad)
            self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")
            self.assertEqual(r["error"]["fields"]["capital"], self.CAP_MSG)
        status, r = self.post("/api/recommend", {"region": "seoul", "staff": 2})
        self.assertEqual(r["error"]["fields"]["capital"], self.CAP_MSG)
        for ok in (500, 100000, 12000.0):
            self.assertEqual(self.rec(capital=ok)[0], 200, ok)

    def test_other_validation(self):
        status, r = self.post("/api/recommend", {"capital": 5000})
        self.assertEqual(status, 400)
        self.assertIn("region", r["error"]["fields"])
        self.assertIn("staff", r["error"]["fields"])
        self.assertEqual(self.rec(staff=0)[0], 400)
        status, r = self.rec(region="narnia")
        self.assertEqual((status, r["error"]["code"]), (400, "UNKNOWN_OPTION"))

    def test_shape_counts_and_order(self):
        status, r = self.rec()
        self.assertEqual(status, 200)
        self.assertEqual(len(r["brands"]), 8)  # 자르지 않고 전부
        self.assertEqual(r["counts"], {"ok": 2, "tight": 3, "short": 2, "insufficient": 1})
        self.assertEqual(sum(r["counts"].values()), len(r["brands"]))
        fits = [b["fit"] for b in r["brands"]]
        self.assertEqual(fits, ["ok", "ok", "tight", "tight", "tight", "short", "short", None])
        for grp in ("ok", "tight", "short"):
            lows = [b["summary"]["profit"]["low"] for b in r["brands"] if b["fit"] == grp]
            self.assertEqual(lows, sorted(lows, reverse=True))
        last = r["brands"][-1]
        self.assertEqual(last["name"], "예시 브랜드 라 (자료 없음 시험용)")
        self.assertIsNone(last["startup_cost"])
        self.assertIsNone(last["gap"])
        self.assertEqual(last["summary"]["status"], "insufficient")
        self.assertIsNone(last["summary"]["profit"])
        card = r["brands"][0]
        self.assertEqual(set(card.keys()), {"id", "name", "industry", "logo_hint", "startup_cost", "fit", "gap",
                                            "summary", "data_status"})
        self.assertIn(card["logo_hint"]["shape"], ("circle", "square", "triangle", "diamond", "hexagon"))
        self.assertIn(card["logo_hint"]["tone"], ("orange", "lavender", "sage", "black"))
        self.assertEqual(set(card["summary"].keys()), {"status", "profit", "breakeven", "missing"})
        self.assertEqual(r["geo"]["granularity"], "sido_average")

    def test_fit_and_gap_values(self):
        status, r = self.rec()
        byname = dict((b["name"], b) for b in r["brands"])
        a = byname["예시 브랜드 가 (치킨)"]  # 9,200 ~ 16,300, 자본 12,000
        self.assertEqual((a["startup_cost"]["low"], a["startup_cost"]["high"]), (9200, 16300))
        self.assertEqual(a["fit"], "tight")
        self.assertEqual(a["gap"], {"shortfall_low": 0, "shortfall_high": 4300})
        self.assertEqual((a["summary"]["profit"]["low"], a["summary"]["profit"]["high"]), (-311, 894))
        n = byname["예시 브랜드 나 (분식)"]  # 6,000 ~ 10,900
        self.assertEqual(n["fit"], "ok")
        self.assertEqual(n["gap"], {"surplus_low": 1100, "surplus_high": 6000})
        c = byname["예시 브랜드 다 (카페)"]  # 13,000 ~ 22,500
        self.assertEqual(c["fit"], "short")
        self.assertEqual(c["gap"], {"shortfall_low": 1000, "shortfall_high": 10500})
        # 경계: 자본 == high 는 ok, 자본 == low 는 tight
        status, r2 = self.rec(capital=10900)
        self.assertEqual(dict((b["id"], b["fit"]) for b in r2["brands"])["brand_b"], "ok")
        status, r3 = self.rec(capital=6000)
        self.assertEqual(dict((b["id"], b["fit"]) for b in r3["brands"])["brand_b"], "tight")

    def test_low_and_high_capital_extremes(self):
        status, r = self.rec(capital=500)
        self.assertEqual(r["counts"], {"ok": 0, "tight": 0, "short": 7, "insufficient": 1})
        status, r = self.rec(capital=100000)
        self.assertEqual(r["counts"], {"ok": 7, "tight": 0, "short": 0, "insufficient": 1})

    def test_insufficient_region_all_insufficient(self):
        status, r = self.rec(region="busan")
        self.assertEqual(r["counts"], {"ok": 0, "tight": 0, "short": 0, "insufficient": 8})
        for b in r["brands"]:
            self.assertIsNone(b["fit"])
            self.assertIsNone(b["startup_cost"])
            self.assertIsNone(b["summary"]["profit"])
            self.assertEqual(b["data_status"]["level"], 0)

    def test_no_component_or_free_boundary_leak(self):
        status, ctype, text = self.request("POST", "/api/recommend",
                                           raw=json.dumps({"capital": 12000, "region": "seoul", "staff": 2}).encode())
        for key in ("franchise_fee", "education", "interior", "equipment", "other", "deposit", "rent",
                    "royalty", "margin", "cogs", "fixed_monthly", "total_fee_rate", "trace"):
            self.assertNotIn('"%s"' % key, text)

    def test_district(self):
        status, r = self.rec(district="강남구")
        self.assertEqual(status, 200)
        self.assertEqual(r["geo"]["district_label"], "강남구")
        self.assertEqual(r["geo"]["granularity"], "sido_average")
        self.assertEqual(r["geo"]["note"], "구 단위 자료는 아직 연결 전이라 시·도 평균으로 계산했어요")
        # 구 자료가 없으니 정확도를 시·도 값(2)보다 올리지 않음
        self.assertTrue(all(b["data_status"]["level"] <= 1 for b in r["brands"]))
        status, base = self.rec()
        self.assertEqual([b["summary"]["profit"] for b in r["brands"]], [b["summary"]["profit"] for b in base["brands"]])
        for ok in ("__all", "", None):
            status, r = self.rec(district=ok)
            self.assertEqual(status, 200, ok)
            self.assertEqual(r["geo"]["district_code"], "__all")
        status, r = self.rec(district="해운대구")  # 부산의 구
        self.assertEqual(status, 400)
        self.assertEqual(r["error"]["code"], "VALIDATION_ERROR")
        self.assertIn("district", r["error"]["fields"])
        self.assertEqual(self.rec(district=5)[0], 400)
        status, r = self.rec(region="jeju", district="강남구")
        self.assertEqual(status, 400)

    def test_estimate_backward_compatible_and_extended(self):
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "royalty_level": "mid"})
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-281, 919))
        self.assertIsNone(r["fit"])
        self.assertIsNone(r["startup_cost"])
        self.assertEqual(r["geo"]["granularity"], "sido_average")
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "brand_id": "brand_a",
                                                "capital": 12000, "district": "마포구"})
        self.assertEqual(status, 200)
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-311, 894))
        self.assertEqual((r["startup_cost"]["low"], r["startup_cost"]["high"]), (9200, 16300))
        self.assertEqual(r["fit"], "tight")
        self.assertEqual(r["geo"]["district_label"], "마포구")
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "brand_id": "brand_a", "capital": 400})
        self.assertEqual(r["error"]["fields"]["capital"], self.CAP_MSG)
        status, r = self.post("/api/estimate", {"region": "seoul", "staff": 2, "brand_id": "brand_a",
                                                "district": "해운대구"})
        self.assertEqual(status, 400)

    def test_options_two_level_regions(self):
        status, o = self.api("GET", "/api/options")
        by = dict((r["value"], r) for r in o["regions"])
        self.assertEqual(len(o["regions"]), 17)
        for code, n in (("seoul", 25), ("gyeonggi", 31), ("incheon", 10), ("busan", 16), ("daegu", 9),
                        ("daejeon", 5), ("gwangju", 5), ("ulsan", 5), ("jeju", 0), ("sejong", 0)):
            ch = by[code]["children"]
            self.assertEqual(len(ch), n + 1, code)
            self.assertEqual(ch[0], {"value": "__all", "label": by[code]["label"] + " 전체"})
        self.assertEqual(by["seoul"]["children"][1], {"value": "종로구", "label": "종로구"})
        self.assertEqual(o["capital"], {"min": 500, "max": 100000, "unit": "만 원"})
        self.assertEqual(by["seoul"]["accuracy_level"], 2)
        self.assertEqual(by["busan"]["accuracy_level"], 0)

    def test_new_events_and_stats(self):
        self.post("/api/events", {"session_id": SID, "name": "recommend_viewed",
                                  "props": {"region": "seoul", "district": "강남구", "fit_ok": 2, "fit_tight": 3,
                                            "fit_short": 2, "fit_insufficient": 1, "junk": 1}})
        self.assertEqual(self.lines("events")[0]["props"],
                         {"region": "seoul", "district": "강남구", "fit_ok": 2, "fit_tight": 3,
                          "fit_short": 2, "fit_insufficient": 1})
        status, r = self.post("/api/events", {"session_id": SID, "name": "recommend_viewed",
                                              "props": {"fit_ok": "많이"}})
        self.assertEqual(status, 400)
        status, r = self.post("/api/events", {"session_id": SID, "name": "recommend_viewed",
                                              "props": {"fit_ok": -1}})
        self.assertEqual(status, 400)
        self.post("/api/events", {"session_id": SID, "name": "recommend_viewed", "props": {"region": "seoul"}})
        self.post("/api/events", {"session_id": SID2, "name": "recommend_viewed", "props": {}})
        for _ in range(3):
            self.post("/api/events", {"session_id": SID, "name": "brand_picked", "props": {"brand_id": "brand_a"}})
        self.post("/api/events", {"session_id": SID, "name": "premium_viewed"})
        self.post("/api/events", {"session_id": SID, "name": "premium_compare_viewed", "props": {"from": "result"}})
        status, s = self.api("GET", "/api/stats")
        self.assertEqual(s["recommend_viewed_sessions"], 2)
        self.assertEqual(s["brand_picked_sessions"], 1)
        self.assertEqual(s["premium_viewed_sessions"], 1)
        self.assertEqual(s["premium_compare_viewed_sessions"], 1)
        self.assertEqual(s["m1_completed_sessions"], 0)


class StaticTests(ApiTestCase):
    def test_index_and_stats_page(self):
        status, ctype, text = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", ctype)
        self.assertIn("<title>t</title>", text)
        status, ctype, text = self.request("GET", "/stats")
        self.assertEqual(status, 200)
        self.assertIn("<title>s</title>", text)

    def test_traversal_and_data_blocked(self):
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/../data/seed.json",
                     "/data/seed.json", "/%2e%2e%2fdata%2fseed.json", "/public/../secret.txt",
                     "/..\\secret.txt", "/.env"):
            status, ctype, text = self.request("GET", path)
            self.assertEqual(status, 404, path)
            self.assertNotIn("TOP-SECRET", text)
            self.assertNotIn("regions", text)
            self.assertEqual(json.loads(text)["error"]["code"], "NOT_FOUND")

    def test_symlink_escape_blocked(self):
        link = os.path.join(self.public_dir, "leak.txt")
        try:
            os.symlink(os.path.join(self.tmp, "secret.txt"), link)
        except (OSError, NotImplementedError):
            self.skipTest("심볼릭 링크를 만들 수 없는 환경")
        status, _, text = self.request("GET", "/leak.txt")
        self.assertEqual(status, 404)
        self.assertNotIn("TOP-SECRET", text)

    def test_content_type_by_extension(self):
        for name, expected in (("a.css", "text/css"), ("a.js", "text/javascript"), ("a.json", "application/json"),
                               ("a.svg", "image/svg+xml")):
            with open(os.path.join(self.public_dir, name), "w", encoding="utf-8") as f:
                f.write("x")
            status, ctype, _ = self.request("GET", "/" + name)
            self.assertEqual(status, 200)
            self.assertIn(expected, ctype)


class NoPublicFolderTests(ApiTestCase):
    with_public = False

    def test_server_survives_without_public(self):
        status, ctype, text = self.request("GET", "/")
        self.assertEqual(status, 404)
        status, o = self.api("GET", "/api/options")
        self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
