"""손익 추정 계산 (DESIGN.md 3장). 순수 함수: 파일·네트워크를 쓰지 않습니다.

핵심 규칙
- 금액 단위는 만 원, 비율은 % 숫자.
- 자료가 없는 값(None)은 절대 0이나 평균으로 바꾸지 않습니다. 계산 전에 먼저 검사합니다.
- 반올림은 바깥쪽: 낮은 값은 내림, 높은 값은 올림.
"""
import math

STATUS_DEV = "가상 예시(개발용, 출처 미확인)"
STATUS_USER = "수정한 값"
UNIT_MAN = "만 원"
OWNER_NOTE = "사장님 본인 몫도 최저임금 기준으로 넣었어요. 실제로 가져가는 돈과는 다를 수 있어요."
BRAND_NOTE = "브랜드·업종별 매출 차이는 반영하지 않았어요."
LEVEL_LABELS = {0: "자료 부족", 1: "자료 거의 없음", 2: "자료 일부", 3: "자료 충분"}

# 수정 가능 항목 (화면 순서와 같음)
OVERRIDE_KEYS = ("monthly_sales", "rent", "cogs_rate", "wage_per_staff")

ITEM_NAMES = {
    "S": "월 매출",
    "R": "월 임대료",
    "c": "재료비 비율",
    "f": "가맹 비용 비율",
    "F": "고정 가맹 비용",
}


def _floor(x):
    return int(math.floor(round(x, 6)))


def _ceil(x):
    return int(math.ceil(round(x, 6)))


def _range_of(obj):
    """값 객체에서 (low, high)를 꺼냅니다. 자료가 없으면 None."""
    if not isinstance(obj, dict):
        return None
    low, high = obj.get("low"), obj.get("high")
    if low is None or high is None:
        return None
    return (low, high)


def _find(items, key, value):
    for it in items:
        if it.get(key) == value:
            return it
    return None


def _source_name(seed, obj):
    if not isinstance(obj, dict):
        return None
    src = _find(seed.get("sources", []), "id", obj.get("source_id"))
    return src.get("name") if src else None


def _trace_entry(seed, item_name, seed_path, objs):
    names, statuses = [], []
    for o in objs:
        n = _source_name(seed, o)
        if n and n not in names:
            names.append(n)
        s = o.get("status")
        if s and s not in statuses:
            statuses.append(s)
    year = None
    for o in objs:
        if o.get("year") is not None:
            year = o.get("year")
            break
    return {
        "item": item_name,
        "seed_path": seed_path,
        "source_name": " / ".join(names) if names else None,
        "year": year,
        "status": " / ".join(statuses) if statuses else None,
    }


def _user_entry(item_name):
    return {"item": item_name, "seed_path": None, "source_name": "사용자가 수정한 값",
            "year": None, "status": STATUS_USER}


DISTRICT_NOTE = "구 단위 자료는 아직 연결 전이라 시·도 평균으로 계산했어요"
SIDO_NOTE = "시·도 평균으로 계산했어요"
DISTRICT_PARTIAL_NOTE = "일부 항목은 구 단위 자료를 썼고, 나머지는 시·도 평균으로 계산했어요"
STARTUP_PARTS = ("franchise_fee", "education", "interior", "equipment", "other")


def find_district(region, district_code):
    if district_code in (None, "", "__all"):
        return None
    for d in region.get("districts") or []:
        if d.get("code") == district_code:
            return d
    return None


def _pick_geo(region, district, key):
    """구 override(자료가 있을 때만)를 먼저 쓰고, 없으면 시·도 값. (객체, seed 경로, 구 값 사용 여부)"""
    if district is not None:
        ov = (district.get("overrides") or {}).get(key)
        if _range_of(ov) is not None:
            return ov, "regions.%s.districts.%s.overrides.%s" % (region["code"], district["code"], key), True
    return region.get(key), "regions.%s.%s" % (region["code"], key), False


def startup_range(brand, deposit_obj):
    """창업 필요 자금 합계 범위(만 원)와 쓴 값 객체들. 하나라도 자료가 없으면 (None, [])."""
    st = brand.get("startup_cost")
    if not isinstance(st, dict):
        return None, []
    objs = []
    lo = hi = 0
    for k in STARTUP_PARTS + ("__deposit__",):
        o = deposit_obj if k == "__deposit__" else st.get(k)
        rng = _range_of(o)
        if rng is None:
            return None, []
        lo += rng[0]
        hi += rng[1]
        objs.append(o)
    return (_floor(lo), _ceil(hi)), objs


def published_opening(seed, brand):
    opening = brand.get("opening") if brand else None
    if not opening:
        return None

    def source(source_id):
        record = _find(seed["sources"], "id", source_id)
        return {k: record.get(k) for k in ("name", "url", "year", "checked_at")} if record else None

    def public_amount(amount):
        return {k: amount[k] for k in ("low", "high", "unit")}

    total = opening["total"]
    report = {k: opening[k] for k in ("area", "tax", "note")}
    report["total"] = public_amount(total)
    report["source"] = source(total["source_id"])
    report["disclosure"] = source(opening.get("disclosure_source_id"))
    report["items"] = [dict(public_amount(item), label=item["label"]) for item in opening["items"]]
    royalty = opening.get("monthly_royalty")
    report["monthly_royalty"] = dict(public_amount(royalty), tax=royalty["tax"],
                                     source=source(royalty["source_id"])) if royalty else None
    return report


def classify_fit(capital, rng):
    """(fit, gap). 자본 >= high: ok, low <= 자본 < high: tight, 자본 < low: short."""
    if rng is None or capital is None:
        return None, None
    low, high = rng
    if capital >= high:
        return "ok", {"surplus_low": capital - high, "surplus_high": capital - low}
    fit = "tight" if capital >= low else "short"
    return fit, {"shortfall_low": max(low - capital, 0), "shortfall_high": high - capital}


def estimate(seed, inp):
    """inp는 lib/validate.py에서 검사를 마친 입력.

    {"region": code, "staff": int(사장님 포함 일하는 사람 수, 1~10), ("brand_id": id | "royalty_level": id), "overrides": {...}}
    """
    region = _find(seed["regions"], "code", inp["region"])
    district = find_district(region, inp.get("district"))
    district_used = [False]
    staff = inp["staff"]
    ov = {k: v for k, v in (inp.get("overrides") or {}).items() if v is not None}
    min_wage = seed["constants"]["min_wage"]
    w_min_man = min_wage["monthly_won"] / 10000.0  # 원 -> 만 원

    used_objs = []   # 실제 계산에 쓴 seed 값 객체(개발용 안내 판단용)
    trace = []
    user_filled = False  # seed에 없던 값을 사용자가 채웠는가

    def take(key, name, override_key, seed_obj, seed_path):
        """항목 하나의 (low, high)를 정하고 trace에 기록."""
        nonlocal user_filled
        rng = _range_of(seed_obj)
        if override_key is not None and override_key in ov:
            v = ov[override_key]
            if rng is None:
                user_filled = True
            trace.append(_user_entry(name))
            return (v, v)
        if rng is None:
            trace.append({"item": name, "seed_path": seed_path, "source_name": None,
                          "year": None, "status": "자료 없음"})
            return None
        used_objs.append(seed_obj)
        trace.append(_trace_entry(seed, name, seed_path, [seed_obj]))
        return rng

    # --- 월 매출, 임대료 ---
    def geo_take(key, name, override_key, geo_key):
        obj, path, used = _pick_geo(region, district, geo_key)
        res = take(key, name, override_key, obj, path)
        if used and override_key not in ov:
            district_used[0] = True
        return res

    S = geo_take("S", ITEM_NAMES["S"], "monthly_sales", "sales_monthly")
    R = geo_take("R", ITEM_NAMES["R"], "rent", "rent_monthly")
    # --- 재료비 비율 ---
    c = take("c", ITEM_NAMES["c"], "cogs_rate", seed["cost_assumptions"].get("cogs_rate"),
             "cost_assumptions.cogs_rate")

    # --- 가맹 비용 (브랜드 또는 로열티 수준) ---
    brand = None
    level = None
    if inp.get("brand_id") is not None:
        brand = _find(seed["brands"], "id", inp["brand_id"])
        base = "brands.%s" % brand["id"]
        royalty, margin = brand.get("royalty_rate"), brand.get("margin_rate")
        r_rng, m_rng = _range_of(royalty), _range_of(margin)
        if r_rng is not None and m_rng is not None:
            f = (r_rng[0] + m_rng[0], r_rng[1] + m_rng[1])
            used_objs.extend([royalty, margin])
            trace.append(_trace_entry(seed, ITEM_NAMES["f"],
                                      base + ".royalty_rate + " + base + ".margin_rate",
                                      [royalty, margin]))
        else:
            f = None
            trace.append({"item": ITEM_NAMES["f"], "seed_path": base + ".royalty_rate + " + base + ".margin_rate",
                          "source_name": None, "year": None, "status": "자료 없음"})
        F = take("F", ITEM_NAMES["F"], None, brand.get("fixed_monthly"), base + ".fixed_monthly")
        brand_level = brand.get("accuracy_level", 0)
    else:
        level = _find(seed["royalty_levels"], "id", inp["royalty_level"])
        base = "royalty_levels.%s" % level["id"]
        f = take("f", ITEM_NAMES["f"], None, level.get("total_fee_rate"), base + ".total_fee_rate")
        F = take("F", ITEM_NAMES["F"], None, level.get("fixed_monthly"), base + ".fixed_monthly")
        brand_level = level.get("accuracy_level", 0)

    # --- 인건비 (항상 계산 가능) ---
    below_min_wage = False
    if "wage_per_staff" in ov:
        wage = ov["wage_per_staff"]
        L_lo = L_hi = staff * wage
        below_min_wage = (wage * 10000.0) < min_wage["monthly_won"]
        trace.append(_user_entry("인건비"))
    else:
        mult_obj = seed["cost_assumptions"]["labor_high_multiplier"]
        L_lo = staff * w_min_man
        L_hi = staff * w_min_man * mult_obj["value"]
        used_objs.extend([min_wage, mult_obj])
        trace.append(_trace_entry(seed, "인건비 하한", "constants.min_wage", [min_wage]))
        trace.append(_trace_entry(seed, "인건비 상한(하한에 곱하는 계수)",
                                  "cost_assumptions.labor_high_multiplier", [mult_obj]))
    labor = {
        "low": _floor(L_lo), "high": _ceil(L_hi), "unit": UNIT_MAN,
        "min_wage_monthly_won": min_wage["monthly_won"],
        "min_wage_year": min_wage.get("year"),
        "below_min_wage": below_min_wage,
        "includes_owner": True,
        "owner_note": OWNER_NOTE,
    }

    # --- 정확도 ---
    region_level = region.get("accuracy_level", 0)
    geo_level = region_level
    if district is not None:
        d_acc = (district.get("overrides") or {}).get("accuracy_level")
        if isinstance(d_acc, int):
            geo_level = d_acc
        elif not district_used[0]:
            geo_level = max(region_level - 1, 0)  # 구를 골랐지만 구 자료가 없으면 시·도 값보다 한 단계 낮춤(올리지 않음)
    lvl = min(geo_level, brand_level)
    accuracy = {"level": lvl, "label": LEVEL_LABELS.get(lvl, LEVEL_LABELS[0]),
                "region_name": region["name"]}

    # --- 자료 부족 판정: 하나라도 None이면 계산하지 않음 ---
    missing = []
    for key, val in (("S", S), ("R", R), ("c", c), ("f", f), ("F", F)):
        if val is None:
            missing.append(ITEM_NAMES[key])

    # --- 창업 필요 자금 / 자본 적합도 (브랜드를 골랐을 때만) ---
    startup = None
    opening = published_opening(seed, brand)
    if brand is not None and opening is None:
        dep_obj, dep_path, dep_used = _pick_geo(region, district, "deposit_range")
        if dep_used:
            district_used[0] = True
        rng, s_objs = startup_range(brand, dep_obj)
        if rng is not None:
            startup = rng
            used_objs.extend(s_objs)
            trace.append(_trace_entry(seed, "창업 필요 자금(합계)",
                                      "brands.%s.startup_cost + %s" % (brand["id"], dep_path), s_objs))
        else:
            trace.append({"item": "창업 필요 자금(합계)", "seed_path": "brands.%s.startup_cost + %s" % (brand["id"], dep_path),
                          "source_name": None, "year": None, "status": "자료 없음"})
    comparison = _range_of(opening["total"]) if opening else startup
    fit, gap = classify_fit(inp.get("capital"), comparison)

    # --- 지역 정보 ---
    if district is None:
        granularity, note, d_label = "sido_average", SIDO_NOTE, "%s 전체" % region["name"]
    elif district_used[0]:
        granularity, note, d_label = "district", DISTRICT_PARTIAL_NOTE, district["name"]
    else:
        granularity, note, d_label = "sido_average", DISTRICT_NOTE, district["name"]
    geo = {"region_code": region["code"], "region_label": region["name"],
           "district_code": district["code"] if district else "__all", "district_label": d_label,
           "granularity": granularity, "note": note}

    dev_used = any(o.get("status") == STATUS_DEV for o in used_objs)
    result = {
        "status": None,
        "profit": None,
        "breakeven": None,
        "labor": labor,
        "accuracy": accuracy,
        "missing": missing,
        "overridden": [k for k in OVERRIDE_KEYS if k in ov],
        "data_notice": seed["meta"].get("dev_notice") if dev_used else None,
        "brand_note": BRAND_NOTE,
        "excluded_costs": list(seed.get("excluded_costs", [])),
        "trace": trace,
        "geo": geo,
        "startup_cost": ({"low": startup[0], "high": startup[1], "unit": UNIT_MAN} if startup else None),
        "opening_cost": opening,
        "fit_basis": "published_opening" if opening else "estimated_startup",
        "fit": fit,
        "gap": gap,
    }

    if missing:
        result["status"] = "insufficient"
        return result

    result["status"] = "ok_user_values" if user_filled else "ok"

    S_lo, S_hi = S
    R_lo, R_hi = R
    c_lo, c_hi = c
    f_lo, f_hi = f
    F_lo, F_hi = F
    v_lo = (c_lo + f_lo) / 100.0
    v_hi = (c_hi + f_hi) / 100.0
    K_lo = R_lo + L_lo + F_lo
    K_hi = R_hi + L_hi + F_hi

    P_lo = S_lo * (1 - v_hi) - K_hi
    P_hi = S_hi * (1 - v_lo) - K_lo
    result["profit"] = {"low": _floor(P_lo), "high": _ceil(P_hi), "unit": UNIT_MAN}

    if (1 - v_lo) <= 0 or (1 - v_hi) <= 0:
        result["breakeven"] = {"low": None, "high": None, "unit": UNIT_MAN, "basis": "월 매출",
                               "reason": "VARIABLE_COST_TOO_HIGH"}
    else:
        B_lo = K_lo / (1 - v_lo)
        B_hi = K_hi / (1 - v_hi)
        result["breakeven"] = {"low": _floor(B_lo), "high": _ceil(B_hi), "unit": UNIT_MAN,
                               "basis": "월 매출", "reason": None}
    return result
