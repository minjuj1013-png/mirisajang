import copy
import json
import math
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib import calc  # noqa: E402
from lib.mask import mask_pii  # noqa: E402
from lib.seed import BANNED_WORDS, load_seed, validate_seed  # noqa: E402

SEED_PATH = os.path.join(ROOT, "data", "seed.json")


def base_input(**kw):
    inp = {"region": "seoul", "staff": 2, "royalty_level": "mid", "overrides": {}}
    inp.update(kw)
    return inp


class CalcExampleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.seed, _ = load_seed(SEED_PATH)

    def test_design_example(self):
        r = calc.estimate(self.seed, base_input())
        self.assertEqual(r["status"], "ok")
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-281, 919))
        self.assertEqual((r["breakeven"]["low"], r["breakeven"]["high"]), (1108, 2040))
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (431, 561))
        self.assertEqual(r["labor"]["min_wage_monthly_won"], 2156880)
        self.assertEqual(r["accuracy"]["level"], 2)
        self.assertEqual(r["accuracy"]["label"], "자료 일부")
        self.assertEqual(r["missing"], [])
        self.assertIsNotNone(r["data_notice"])

    def test_negative_profit_is_kept(self):
        r = calc.estimate(self.seed, base_input())
        self.assertLess(r["profit"]["low"], 0)  # 손실을 0으로 자르지 않음

    def test_cogs_override_example(self):
        r = calc.estimate(self.seed, base_input(overrides={"cogs_rate": 35}))
        self.assertEqual((r["profit"]["low"], r["profit"]["high"]), (-206, 794))
        self.assertEqual((r["breakeven"]["low"], r["breakeven"]["high"]), (1198, 1862))
        self.assertEqual(r["overridden"], ["cogs_rate"])
        user_items = [t for t in r["trace"] if t["status"] == "수정한 값"]
        self.assertEqual(len(user_items), 1)

    def test_owner_alone_has_labor(self):
        """사장님 혼자(1명)여도 본인 몫 인건비가 들어간다: 1인 하한 2,156,880원 -> 215.7만 원."""
        r = calc.estimate(self.seed, base_input(staff=1))
        self.assertEqual(r["status"], "ok")
        self.assertGreater(r["labor"]["low"], 0)
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (215, 281))
        self.assertEqual(r["labor"]["low"], math.floor(r["labor"]["min_wage_monthly_won"] / 10000.0))
        self.assertIsNotNone(r["profit"])

    def test_labor_includes_owner_fields(self):
        r = calc.estimate(self.seed, base_input())
        self.assertIs(r["labor"]["includes_owner"], True)
        self.assertIn("사장님", r["labor"]["owner_note"])
        self.assertIn("최저임금", r["labor"]["owner_note"])

    def test_insufficient_region_is_not_zero(self):
        r = calc.estimate(self.seed, base_input(region="busan"))
        self.assertEqual(r["status"], "insufficient")
        self.assertIsNone(r["profit"])
        self.assertIsNone(r["breakeven"])
        self.assertEqual(r["missing"], ["월 매출", "월 임대료"])
        self.assertEqual(r["accuracy"]["level"], 0)
        self.assertEqual(r["accuracy"]["label"], "자료 부족")
        # 인건비는 지역과 무관하게 보여 줌
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (431, 561))

    def test_insufficient_brand_without_data(self):
        r = calc.estimate(self.seed, {"region": "seoul", "staff": 1, "brand_id": "brand_d", "overrides": {}})
        self.assertEqual(r["status"], "insufficient")
        self.assertIsNone(r["profit"])
        self.assertEqual(r["missing"], ["가맹 비용 비율", "고정 가맹 비용"])
        self.assertEqual(r["accuracy"]["level"], 0)

    def test_user_values_resolve_missing(self):
        r = calc.estimate(self.seed, base_input(region="busan",
                                                overrides={"monthly_sales": 2000, "rent": 400}))
        self.assertEqual(r["status"], "ok_user_values")
        self.assertEqual(r["missing"], [])
        self.assertIsNotNone(r["profit"])
        self.assertEqual(r["accuracy"]["level"], 0)  # 자료 상태는 그대로
        # 한 칸만 채우면 아직 자료 부족
        r2 = calc.estimate(self.seed, base_input(region="busan", overrides={"monthly_sales": 2000}))
        self.assertEqual(r2["status"], "insufficient")
        self.assertEqual(r2["missing"], ["월 임대료"])

    def test_override_on_normal_region_stays_ok(self):
        r = calc.estimate(self.seed, base_input(overrides={"monthly_sales": 2000}))
        self.assertEqual(r["status"], "ok")

    def test_accuracy_is_min_of_region_and_brand(self):
        r = calc.estimate(self.seed, {"region": "seoul", "staff": 1, "brand_id": "brand_c", "overrides": {}})
        self.assertEqual(r["accuracy"]["level"], 1)
        self.assertEqual(r["accuracy"]["label"], "자료 거의 없음")

    def test_brand_fixed_cost_included(self):
        a = calc.estimate(self.seed, {"region": "seoul", "staff": 1, "brand_id": "brand_c",
                                          "overrides": {"wage_per_staff": 0}})
        # v: (30+6)~(40+10)=0.36~0.50 / K: 300+10 ~ 500+20
        self.assertEqual(a["profit"]["low"], int(math.floor(1500 * 0.5 - 520)))
        self.assertEqual(a["profit"]["high"], int(math.ceil(2500 * 0.64 - 310)))

    def test_variable_cost_too_high(self):
        r = calc.estimate(self.seed, base_input(royalty_level="high", overrides={"cogs_rate": 90}))
        self.assertEqual(r["status"], "ok")
        self.assertIsNone(r["breakeven"]["low"])
        self.assertIsNone(r["breakeven"]["high"])
        self.assertEqual(r["breakeven"]["reason"], "VARIABLE_COST_TOO_HIGH")
        self.assertIsNotNone(r["profit"])

    def test_wage_override_and_below_min_wage(self):
        r = calc.estimate(self.seed, base_input(overrides={"wage_per_staff": 200}))
        self.assertTrue(r["labor"]["below_min_wage"])
        self.assertEqual((r["labor"]["low"], r["labor"]["high"]), (400, 400))
        r2 = calc.estimate(self.seed, base_input(overrides={"wage_per_staff": 250}))
        self.assertFalse(r2["labor"]["below_min_wage"])

    def test_rounding_is_outward(self):
        r = calc.estimate(self.seed, base_input())
        # 낮은 값 -280.79 -> -281(내림), 높은 값 918.62 -> 919(올림)
        self.assertEqual(r["profit"]["low"], -281)
        self.assertEqual(r["profit"]["high"], 919)

    def test_trace_has_no_numbers_and_has_paths(self):
        r = calc.estimate(self.seed, base_input())
        paths = [t["seed_path"] for t in r["trace"]]
        self.assertIn("regions.seoul.sales_monthly", paths)
        self.assertIn("royalty_levels.mid.total_fee_rate", paths)
        self.assertIn("constants.min_wage", paths)
        for t in r["trace"]:
            self.assertEqual(set(t.keys()), {"item", "seed_path", "source_name", "year", "status"})

    def test_free_response_has_no_rent_or_royalty_values(self):
        """임대료·로열티 값이 응답에 새지 않는다 (독특한 값으로 바꿔서 검사)."""
        seed = copy.deepcopy(self.seed)
        for r in seed["regions"]:
            if r["code"] == "seoul":
                r["rent_monthly"]["low"] = 377.77
                r["rent_monthly"]["high"] = 483.33
        for lv in seed["royalty_levels"]:
            if lv["id"] == "mid":
                lv["total_fee_rate"]["low"] = 4.4747
                lv["total_fee_rate"]["high"] = 8.5858
        text = json.dumps(calc.estimate(seed, base_input()), ensure_ascii=False)
        for secret in ("377.77", "483.33", "4.4747", "8.5858", "377", "483"):
            self.assertNotIn(secret, text)
        for banned_key in ("rent", "royalty", "cogs", "임대료_값"):
            self.assertNotIn('"%s"' % banned_key, text)

    def test_no_banned_phrases_in_result(self):
        text = json.dumps(calc.estimate(self.seed, base_input()), ensure_ascii=False)
        for w in BANNED_WORDS:
            self.assertNotIn(w, text)

    def test_data_notice_only_when_dev_values_used(self):
        seed = copy.deepcopy(self.seed)
        r = calc.estimate(seed, base_input(region="busan", overrides={}))
        # 부산은 자료가 없어도 로열티·최저임금 등 개발용 값이 쓰였으므로 안내가 붙음
        self.assertIsNotNone(r["data_notice"])


class SeedValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SEED_PATH, encoding="utf-8") as f:
            cls.raw = json.load(f)

    def fresh(self):
        return copy.deepcopy(self.raw)

    def test_real_seed_passes(self):
        errors, warnings = validate_seed(self.fresh())
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_seed_shape(self):
        s = self.fresh()
        self.assertEqual(len(s["regions"]), 17)
        levels = dict((r["code"], r["accuracy_level"]) for r in s["regions"])
        self.assertEqual(levels["seoul"], 2)
        self.assertEqual(levels["gyeonggi"], 2)
        self.assertEqual(sum(1 for v in levels.values() if v == 0), 15)
        self.assertEqual(len(s["brands"]), 8)
        for b in s["brands"]:
            self.assertTrue(b["name"].startswith("예시 브랜드"))
        mw = s["constants"]["min_wage"]
        self.assertEqual((mw["hourly_won"], mw["monthly_won"], mw["hours_per_month"]), (10320, 2156880, 209))
        self.assertEqual(mw["status"], "조건부")

    def test_missing_status_is_error(self):
        s = self.fresh()
        del s["regions"][0]["sales_monthly"]["status"]
        errors, _ = validate_seed(s)
        self.assertTrue(any("status" in e and "서울" in e for e in errors), errors)

    def test_missing_source_year_keys(self):
        s = self.fresh()
        del s["cost_assumptions"]["cogs_rate"]["source_id"]
        del s["cost_assumptions"]["cogs_rate"]["year"]
        errors, _ = validate_seed(s)
        self.assertTrue(any("source_id" in e for e in errors))
        self.assertTrue(any("year" in e for e in errors))

    def test_unconfirmed_with_number_is_error(self):
        s = self.fresh()
        s["regions"][0]["sales_monthly"]["status"] = "미확인"
        errors, _ = validate_seed(s)
        self.assertTrue(any("미확인" in e for e in errors))

    def test_bad_status_and_unknown_source(self):
        s = self.fresh()
        s["regions"][0]["rent_monthly"]["status"] = "아마도"
        s["regions"][8]["rent_monthly"]["source_id"] = "src_nope"
        errors, _ = validate_seed(s)
        self.assertTrue(any("아마도" in e for e in errors))
        self.assertTrue(any("src_nope" in e for e in errors))

    def test_real_brand_name_is_error(self):
        s = self.fresh()
        s["brands"][0]["name"] = "어떤 실제 브랜드"
        errors, _ = validate_seed(s)
        self.assertTrue(any("예시 브랜드" in e for e in errors))

    def test_forbidden_numbers_warn(self):
        s = self.fresh()
        s["regions"][0]["sales_monthly"]["high"] = 35100
        _, warnings = validate_seed(s)
        self.assertTrue(any("35100" in w for w in warnings))

    def test_dev_values_require_dev_flag(self):
        s = self.fresh()
        s["meta"]["is_dev_data"] = False
        errors, _ = validate_seed(s)
        self.assertTrue(any("is_dev_data" in e for e in errors))

    def test_banned_phrase_in_seed_is_error(self):
        s = self.fresh()
        s["glossary"][0]["text"] = "이건 " + BANNED_WORDS[0] + "돼요"
        errors, _ = validate_seed(s)
        self.assertTrue(any("단정 표현" in e for e in errors))

    def test_seed_file_has_no_banned_phrases(self):
        with open(SEED_PATH, encoding="utf-8") as f:
            text = f.read()
        for w in BANNED_WORDS:
            self.assertNotIn(w, text)


class RecommendCalcTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.seed, _ = load_seed(SEED_PATH)

    def test_classify_fit_boundaries(self):
        self.assertEqual(calc.classify_fit(1000, (500, 1000))[0], "ok")
        self.assertEqual(calc.classify_fit(999, (500, 1000))[0], "tight")
        self.assertEqual(calc.classify_fit(500, (500, 1000))[0], "tight")
        self.assertEqual(calc.classify_fit(499, (500, 1000))[0], "short")
        self.assertEqual(calc.classify_fit(1500, (500, 1000))[1], {"surplus_low": 500, "surplus_high": 1000})
        self.assertEqual(calc.classify_fit(300, (500, 1000))[1], {"shortfall_low": 200, "shortfall_high": 700})
        self.assertEqual(calc.classify_fit(None, (500, 1000)), (None, None))
        self.assertEqual(calc.classify_fit(900, None), (None, None))

    def test_startup_is_sum_of_parts_and_deposit(self):
        r = calc.estimate(self.seed, {"region": "seoul", "staff": 1, "brand_id": "brand_a", "overrides": {}})
        self.assertEqual((r["startup_cost"]["low"], r["startup_cost"]["high"]), (9200, 16300))
        self.assertIsNone(r["fit"])  # 자본을 안 보냈으면 판정 없음
        self.assertTrue(any(t["item"] == "창업 필요 자금(합계)" and t["status"] for t in r["trace"]))

    def test_gyeonggi_deposit_differs(self):
        r = calc.estimate(self.seed, {"region": "gyeonggi", "staff": 1, "brand_id": "brand_a", "overrides": {}})
        self.assertEqual((r["startup_cost"]["low"], r["startup_cost"]["high"]), (8200, 14300))

    def test_brand_d_has_no_startup(self):
        r = calc.estimate(self.seed, {"region": "seoul", "staff": 1, "brand_id": "brand_d", "capital": 9000,
                                      "overrides": {}})
        self.assertIsNone(r["startup_cost"])
        self.assertIsNone(r["fit"])
        self.assertEqual(r["status"], "insufficient")

    def test_district_inherits_sido_and_lowers_accuracy(self):
        base = calc.estimate(self.seed, base_input())
        d = calc.estimate(self.seed, base_input(district="종로구"))
        self.assertEqual(base["profit"], d["profit"])
        self.assertEqual(base["accuracy"]["level"], 2)
        self.assertEqual(d["accuracy"]["level"], 1)  # 시·도 값(2)보다 올리지 않음
        self.assertEqual(d["geo"]["granularity"], "sido_average")
        self.assertIn("시·도 평균", d["geo"]["note"])
        self.assertEqual(calc.estimate(self.seed, base_input(district="__all"))["accuracy"]["level"], 2)

    def test_district_override_structure_is_used_when_filled(self):
        seed = copy.deepcopy(self.seed)
        dev = {"low": 1000, "high": 1200, "unit": "만 원", "year": None, "source_id": "src_dev_placeholder",
               "status": "가상 예시(개발용, 출처 미확인)"}
        seoul = [r for r in seed["regions"] if r["code"] == "seoul"][0]
        jongno = [d for d in seoul["districts"] if d["code"] == "종로구"][0]
        jongno["overrides"] = {"sales_monthly": dev, "accuracy_level": 2}
        self.assertEqual(validate_seed(seed)[0], [])
        r = calc.estimate(seed, base_input(district="종로구"))
        self.assertEqual(r["geo"]["granularity"], "district")
        self.assertEqual(r["accuracy"]["level"], 2)
        paths = [t["seed_path"] for t in r["trace"]]
        self.assertIn("regions.seoul.districts.종로구.overrides.sales_monthly", paths)
        self.assertIn("regions.seoul.rent_monthly", paths)  # 값이 비어 있는 항목은 시·도 값
        self.assertNotEqual(r["profit"], calc.estimate(seed, base_input())["profit"])

    def test_startup_values_do_not_leak(self):
        seed = copy.deepcopy(self.seed)
        for b in seed["brands"]:
            if b["id"] == "brand_a":
                for k, o in b["startup_cost"].items():
                    o["low"] = 1111.11 + len(k)
                    o["high"] = 2222.22 + len(k)
        text = json.dumps(calc.estimate(seed, {"region": "seoul", "staff": 2, "brand_id": "brand_a",
                                               "capital": 20000, "overrides": {}}), ensure_ascii=False)
        for secret in ("1111.11", "2222.22", "1116.11", "franchise_fee", "interior", "education", "equipment"):
            self.assertNotIn(secret, text)


class SeedExpansionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SEED_PATH, encoding="utf-8") as f:
            cls.raw = json.load(f)

    def fresh(self):
        return copy.deepcopy(self.raw)

    def test_new_seed_content(self):
        s = self.fresh()
        self.assertEqual([b["name"][:8] for b in s["brands"]],
                         ["예시 브랜드 %s" % c for c in "가나다라마바사아"])
        self.assertIsNone([b for b in s["brands"] if b["id"] == "brand_d"][0]["startup_cost"])
        deposits = dict((r["code"], r["deposit_range"]) for r in s["regions"])
        self.assertIsNotNone(deposits["seoul"])
        self.assertIsNotNone(deposits["gyeonggi"])
        self.assertEqual(sum(1 for v in deposits.values() if v is None), 15)
        counts = dict((r["code"], len(r["districts"])) for r in s["regions"])
        self.assertEqual((counts["seoul"], counts["gyeonggi"], counts["incheon"], counts["busan"]), (25, 31, 10, 16))
        for r in s["regions"]:
            for d in r["districts"]:
                self.assertEqual(d["overrides"], {})  # 값은 비워 둠

    def test_bad_logo_and_startup_and_district_rules(self):
        s = self.fresh()
        s["brands"][0]["logo_hint"]["shape"] = "star"
        self.assertTrue(any("logo_hint" in e for e in validate_seed(s)[0]))
        s = self.fresh()
        del s["brands"][0]["startup_cost"]["interior"]
        self.assertTrue(any("startup_cost" in e for e in validate_seed(s)[0]))
        s = self.fresh()
        s["regions"][0]["districts"][0]["code"] = "__all"
        self.assertTrue(any("예약" in e for e in validate_seed(s)[0]))
        s = self.fresh()
        s["regions"][0]["districts"][1]["code"] = s["regions"][0]["districts"][0]["code"]
        self.assertTrue(any("중복" in e for e in validate_seed(s)[0]))
        s = self.fresh()
        s["regions"][0]["districts"][0]["overrides"] = {"hack": 1}
        self.assertTrue(any("hack" in e for e in validate_seed(s)[0]))
        s = self.fresh()
        s["brands"][0]["startup_cost"]["other"]["status"] = None
        self.assertTrue(any("status" in e for e in validate_seed(s)[0]))


class MaskTests(unittest.TestCase):
    def test_phone(self):
        for s in ("010-1234-5678", "01012345678", "02-123-4567", "+82 10-1234-5678", "(02) 1234-5678"):
            self.assertEqual(mask_pii("전화 " + s + " 입니다"), "전화 [가림] 입니다", s)

    def test_rrn_and_account(self):
        self.assertEqual(mask_pii("900101-1234567"), "[가림]")
        self.assertEqual(mask_pii("9001011234567"), "[가림]")
        self.assertEqual(mask_pii("계좌 110-123-456789"), "계좌 [가림]")
        self.assertEqual(mask_pii("1234567890123456"), "[가림]")

    def test_email(self):
        self.assertEqual(mask_pii("me@example.com 로 연락"), "[가림] 로 연락")

    def test_normal_text_kept(self):
        t = "임대료를 어디서 고치는지 몰랐어요. 직원 3명, 매출 2000만 원"
        self.assertEqual(mask_pii(t), t)


if __name__ == "__main__":
    unittest.main()
