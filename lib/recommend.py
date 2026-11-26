"""자본 기준 브랜드 추천 (/api/recommend). 계산은 calc.estimate를 그대로 재사용합니다."""
import math
from collections import Counter

from lib import calc
from lib.validate import CAPITAL_MAX

FIT_ORDER = {"ok": 0, "tight": 1, "short": 2, None: 3}


def recommend(seed, inp):
    """inp: validate_recommend를 통과한 {capital, region, district?, staff}."""
    cards = []
    thresholds = Counter()
    geo = None
    data_notice = None
    for idx, brand in enumerate(seed["brands"]):
        est = calc.estimate(seed, {
            "region": inp["region"], "district": inp.get("district"), "staff": inp["staff"],
            "brand_id": brand["id"], "capital": inp["capital"], "overrides": {}})
        geo = est["geo"]
        data_notice = data_notice or est["data_notice"]
        # 창업 자금 범위나 순수익 계산 중 하나라도 자료가 없으면 '자료 부족' 묶음
        insufficient = est["opening_cost"] is None and (
            est["status"] == "insufficient" or est["startup_cost"] is None
        )
        fit = None if insufficient else est["fit"]
        gap = None if insufficient else est["gap"]
        card = {
            "id": brand["id"],
            "name": brand["name"],
            "industry": brand.get("industry"),
            "logo_hint": dict(brand["logo_hint"]),
            "startup_cost": est["startup_cost"],
            "opening_cost": est["opening_cost"],
            "fit_basis": est["fit_basis"],
            "fit": fit,
            "gap": gap,
            "summary": {
                "status": est["status"],
                "profit": est["profit"],
                "breakeven": est["breakeven"],
                "missing": est["missing"],
            },
            "data_status": {"level": est["accuracy"]["level"], "label": est["accuracy"]["label"],
                            "data_notice": est["data_notice"]},
        }
        low = est["profit"]["low"] if est["profit"] else None
        opening = est["opening_cost"]
        upper_cost = opening["total"]["high"] if opening else 0
        if opening:
            threshold = math.ceil(upper_cost)
            if inp["capital"] < threshold <= CAPITAL_MAX:
                thresholds[threshold] += 1
        order = (FIT_ORDER[fit], low is None, -(low or 0), upper_cost, idx)
        cards.append((order, card))
    cards.sort(key=lambda item: item[0])
    ordered = [card for _, card in cards]
    counts = {"ok": 0, "tight": 0, "short": 0, "insufficient": 0}
    for c in ordered:
        counts[c["fit"] if c["fit"] else "insufficient"] += 1
    steps = []
    added = 0
    for threshold in sorted(thresholds)[:3]:
        added += thresholds[threshold]
        steps.append({"capital": threshold, "additional": threshold - inp["capital"],
                      "possible": counts["ok"] + added, "added": added})
    return {
        "capital": inp["capital"],
        "staff": inp["staff"],
        "geo": geo,
        "counts": counts,
        "capital_steps": steps,
        "brands": ordered,
        "data_notice": data_notice,
        "brand_note": calc.BRAND_NOTE,
        "excluded_costs": list(seed.get("excluded_costs", [])),
    }
