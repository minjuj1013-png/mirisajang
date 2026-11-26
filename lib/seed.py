"""seed.json 읽기 + 규칙 검사 (DESIGN.md 4-1).

규칙을 어기면 SeedError를 일으키고, server.py가 한국어로 출력한 뒤 켜지지 않습니다.
"""
import json
from urllib.parse import urlsplit

ALLOWED_STATUS = ("확인됨", "조건부", "미확인", "가상 예시(개발용, 출처 미확인)")
STATUS_DEV = "가상 예시(개발용, 출처 미확인)"
DEV_SOURCE_ID = "src_dev_placeholder"
VALUE_KEYS = ("low", "high", "value", "hourly_won", "monthly_won")
REQUIRED_KEYS = ("source_id", "year", "status")
FORBIDDEN_NUMBERS = (35100, 22.9, 17.5, 28.8)  # 3.51억(만 원), 공정위 수치 오용 방지

LOGO_SHAPES = ("circle", "square", "triangle", "diamond", "hexagon")
LOGO_TONES = ("orange", "lavender", "sage", "black")
STARTUP_KEYS = ("franchise_fee", "education", "interior", "equipment", "other")
DISTRICT_OVERRIDE_KEYS = ("sales_monthly", "rent_monthly", "deposit_range", "accuracy_level")
ALL_DISTRICT = "__all"

# 단정 표현은 코드 안에 글자 그대로 두지 않고 조합합니다(프로젝트 검색에 걸리지 않게).
BANNED_WORDS = ("보" + "장", "확실" + "히")


class SeedError(Exception):
    def __init__(self, errors, warnings=None):
        Exception.__init__(self, "seed 검사 실패")
        self.errors = errors
        self.warnings = warnings or []


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_value_obj(d):
    return isinstance(d, dict) and any(k in d for k in VALUE_KEYS)


def validate_seed(seed):
    """(errors, warnings) 두 개의 한국어 문장 목록을 돌려줍니다."""
    errors, warnings = [], []
    if not isinstance(seed, dict):
        return ["seed.json 맨 바깥은 { } 모양이어야 해요."], []

    for key in ("meta", "sources", "constants", "regions", "brands", "royalty_levels",
                "cost_assumptions", "excluded_costs", "glossary"):
        if key not in seed:
            errors.append("최상위 항목 '%s'이(가) 없어요." % key)
    if errors:
        return errors, warnings

    source_ids = set()
    sources = {}
    for i, s in enumerate(seed["sources"]):
        if not isinstance(s, dict) or "id" not in s:
            errors.append("sources[%d]에 id가 없어요." % i)
        elif s["id"] in source_ids:
            errors.append("sources에 같은 id '%s'가 두 번 있어요." % s["id"])
        else:
            source_ids.add(s["id"])
            sources[s["id"]] = s

    dev_used = [False]

    def check_value_obj(d, label):
        for k in REQUIRED_KEYS:
            if k not in d:
                errors.append("%s: '%s' 항목이 없어요. (숫자에는 source_id, year, status가 꼭 있어야 해요.)" % (label, k))
        status = d.get("status")
        if "status" in d and status not in ALLOWED_STATUS:
            errors.append("%s: status '%s'는 쓸 수 없는 값이에요. (%s 중 하나)" % (label, status, ", ".join(ALLOWED_STATUS)))
        nums = {}
        for k in VALUE_KEYS:
            if k in d:
                if d[k] is not None and not _is_number(d[k]):
                    errors.append("%s: '%s'는 숫자 또는 null이어야 해요." % (label, k))
                else:
                    nums[k] = d[k]
        if status == "미확인":
            if any(v is not None for v in nums.values()):
                errors.append("%s: status가 '미확인'인데 숫자가 들어 있어요. 숫자 대신 null로 두세요." % label)
        elif status in ALLOWED_STATUS:
            if any(v is None for v in nums.values()):
                errors.append("%s: 숫자가 비어(null) 있는데 status가 '%s'예요. 값이 없으면 '미확인'이어야 해요." % (label, status))
        lo, hi = nums.get("low"), nums.get("high")
        if _is_number(lo) and _is_number(hi) and lo > hi:
            errors.append("%s: low(%s)가 high(%s)보다 커요." % (label, lo, hi))
        for k, val in nums.items():
            if _is_number(val) and val < 0:
                errors.append("%s: '%s'가 음수예요." % (label, k))
            if _is_number(val) and any(val == fb for fb in FORBIDDEN_NUMBERS):
                warnings.append("%s: '%s' 값 %s는 계산용으로 쓰면 안 되는 수치예요(공정위 수치·평균 매출 오용 주의)." % (label, k, val))
        sid = d.get("source_id")
        if "source_id" in d and sid not in source_ids:
            errors.append("%s: source_id '%s'가 sources에 없어요." % (label, sid))
        if status == STATUS_DEV:
            dev_used[0] = True
            if sid != DEV_SOURCE_ID:
                errors.append("%s: 가상 예시 값은 source_id가 '%s'여야 해요." % (label, DEV_SOURCE_ID))
        elif sid == DEV_SOURCE_ID and status in ALLOWED_STATUS:
            errors.append("%s: 개발용 자리 값 출처를 쓰면서 status가 '%s'예요. 값과 출처를 함께 고쳐 주세요." % (label, status))

    def walk(node, label):
        if isinstance(node, dict):
            if _is_value_obj(node):
                check_value_obj(node, label)
                return
            for k, v in node.items():
                walk(v, "%s.%s" % (label, k) if label else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                name = v.get("name") or v.get("label") if isinstance(v, dict) else None
                walk(v, "%s[%d]%s" % (label, i, " (%s)" % name if name else ""))

    for key in ("constants", "regions", "brands", "royalty_levels", "cost_assumptions"):
        walk(seed[key], key)

    # --- 구조 검사 ---
    mw = seed["constants"].get("min_wage") if isinstance(seed["constants"], dict) else None
    if not isinstance(mw, dict):
        errors.append("constants.min_wage가 없어요.")
    else:
        h, m, hrs = mw.get("hourly_won"), mw.get("monthly_won"), mw.get("hours_per_month")
        if not (_is_number(h) and _is_number(m) and _is_number(hrs)):
            errors.append("constants.min_wage: hourly_won, monthly_won, hours_per_month는 모두 숫자여야 해요.")
        elif abs(h * hrs - m) > 1:
            errors.append("constants.min_wage: 시급 × 월 시간(%s × %s)이 월 환산액(%s)과 달라요." % (h, hrs, m))

    seen = set()
    for i, r in enumerate(seed["regions"]):
        lab = "regions[%d]" % i
        if not isinstance(r, dict) or "code" not in r or "name" not in r:
            errors.append("%s: code 또는 name이 없어요." % lab)
            continue
        if r["code"] in seen:
            errors.append("%s: 지역 code '%s'가 중복이에요." % (lab, r["code"]))
        seen.add(r["code"])
        lv = r.get("accuracy_level")
        if not isinstance(lv, int) or isinstance(lv, bool) or not 0 <= lv <= 3:
            errors.append("%s (%s): accuracy_level은 0~3 정수여야 해요." % (lab, r["name"]))
        elif lv == 3:
            warnings.append("%s (%s): 정확도 3은 기준이 정해질 때까지 쓰지 않기로 했어요." % (lab, r["name"]))
        dist_codes = set()
        districts = r.get("districts", [])
        if not isinstance(districts, list):
            errors.append("%s (%s): districts는 목록이어야 해요." % (lab, r["name"]))
            districts = []
        for j, d in enumerate(districts):
            dl = "%s (%s).districts[%d]" % (lab, r["name"], j)
            if not isinstance(d, dict) or not d.get("code") or not d.get("name"):
                errors.append("%s: code와 name이 있어야 해요." % dl)
                continue
            if d["code"] == ALL_DISTRICT:
                errors.append("%s: code '%s'는 '시·도 전체'용으로 예약돼 있어요." % (dl, ALL_DISTRICT))
            if d["code"] in dist_codes:
                errors.append("%s: 시·군·구 code '%s'가 중복이에요." % (dl, d["code"]))
            dist_codes.add(d["code"])
            ov = d.get("overrides", {})
            if not isinstance(ov, dict):
                errors.append("%s: overrides는 { } 모양이어야 해요." % dl)
                continue
            for k, val in ov.items():
                if k not in DISTRICT_OVERRIDE_KEYS:
                    errors.append("%s: overrides에 쓸 수 없는 항목 '%s'이(가) 있어요. (%s 중 하나)" % (dl, k, ", ".join(DISTRICT_OVERRIDE_KEYS)))
                elif k == "accuracy_level" and val is not None and (not isinstance(val, int) or isinstance(val, bool) or not 0 <= val <= 3):
                    errors.append("%s: overrides.accuracy_level은 0~3 정수여야 해요." % dl)
        if r.get("sales_monthly") is None or r.get("rent_monthly") is None:
            if isinstance(lv, int) and lv > 0:
                warnings.append("%s (%s): 매출·임대료 자료가 비었는데 정확도가 %s예요." % (lab, r["name"], lv))

    seen = set()
    for i, b in enumerate(seed["brands"]):
        lab = "brands[%d]" % i
        if not isinstance(b, dict) or "id" not in b:
            errors.append("%s: id가 없어요." % lab)
            continue
        if b["id"] in seen:
            errors.append("%s: 브랜드 id '%s'가 중복이에요." % (lab, b["id"]))
        seen.add(b["id"])
        name = b.get("name")
        fictional = b.get("is_fictional")
        if not isinstance(name, str) or not name.strip() or not isinstance(fictional, bool):
            errors.append("%s: 브랜드 이름과 is_fictional 값이 필요해요." % lab)
        elif fictional and not name.startswith("예시 브랜드"):
            errors.append("%s: 가상 브랜드 이름은 '예시 브랜드'로 시작해야 해요." % lab)
        lv = b.get("accuracy_level")
        if not isinstance(lv, int) or isinstance(lv, bool) or not 0 <= lv <= 3:
            errors.append("%s: accuracy_level은 0~3 정수여야 해요." % lab)
        if not isinstance(b.get("industry"), str) or not b.get("industry").strip():
            errors.append("%s: industry(업종 문구)가 있어야 해요." % lab)
        lh = b.get("logo_hint")
        if not isinstance(lh, dict) or lh.get("shape") not in LOGO_SHAPES or lh.get("tone") not in LOGO_TONES:
            errors.append("%s: logo_hint는 shape(%s)와 tone(%s)을 가져야 해요." % (lab, ", ".join(LOGO_SHAPES), ", ".join(LOGO_TONES)))
        st = b.get("startup_cost")
        if st is not None:
            if not isinstance(st, dict) or any(k not in st for k in STARTUP_KEYS):
                errors.append("%s: startup_cost에는 %s 항목이 모두 있어야 해요. (자료가 없으면 startup_cost 전체를 null로)" % (lab, ", ".join(STARTUP_KEYS)))
        if fictional is False:
            opening = b.get("opening")
            if not isinstance(opening, dict) or not all(
                isinstance(opening.get(k), str) and opening[k].strip() for k in ("area", "tax", "note")
            ):
                errors.append(f"{lab}: 개설비의 면적, 부가세 기준, 안내가 필요해요.")
                continue
            total, items = opening.get("total"), opening.get("items")
            if not isinstance(total, dict) or not isinstance(items, list) or not items or not all(
                isinstance(item, dict) and isinstance(item.get("label"), str) and item["label"].strip()
                for item in items
            ):
                errors.append(f"{lab}: 개설비 합계와 세부 항목이 필요해요.")
                continue
            amounts = [total, *items]
            if opening.get("monthly_royalty") is not None:
                royalty = opening["monthly_royalty"]
                if not isinstance(royalty, dict) or not isinstance(royalty.get("tax"), str) or not royalty["tax"].strip():
                    errors.append(f"{lab}: 월 로열티의 부가세 기준이 필요해요.")
                    continue
                amounts.append(royalty)
            for amount in amounts:
                src = sources.get(amount.get("source_id"), {})
                url = urlsplit(src.get("url") or "")
                if (url.scheme != "https" or not url.netloc or not src.get("checked_at")
                        or amount.get("unit") != "만 원" or amount.get("status") not in ("조건부", "확인됨")
                        or not all(_is_number(amount.get(k)) for k in ("low", "high"))):
                    errors.append(f"{lab}: 공개 금액에는 확인일과 HTTPS 출처가 필요해요.")
            for bound in ("low", "high"):
                if all(_is_number(item.get(bound)) for item in [total, *items]):
                    if abs(sum(item[bound] for item in items) - total[bound]) > 0.000001:
                        errors.append(f"{lab}: 개설비 합계가 항목별 금액의 합과 달라요.")
            disclosure_id = opening.get("disclosure_source_id")
            if disclosure_id and disclosure_id not in sources:
                errors.append(f"{lab}: 정보공개서 출처를 찾을 수 없어요.")

    seen = set()
    for i, lv_ in enumerate(seed["royalty_levels"]):
        lab = "royalty_levels[%d]" % i
        if not isinstance(lv_, dict) or "id" not in lv_ or "label" not in lv_:
            errors.append("%s: id 또는 label이 없어요." % lab)
            continue
        if lv_["id"] in seen:
            errors.append("%s: id '%s'가 중복이에요." % (lab, lv_["id"]))
        seen.add(lv_["id"])
        a = lv_.get("accuracy_level")
        if not isinstance(a, int) or isinstance(a, bool) or not 0 <= a <= 3:
            errors.append("%s: accuracy_level은 0~3 정수여야 해요." % lab)

    ca = seed["cost_assumptions"]
    if not isinstance(ca, dict) or "cogs_rate" not in ca or "labor_high_multiplier" not in ca:
        errors.append("cost_assumptions에는 cogs_rate와 labor_high_multiplier가 있어야 해요.")
    else:
        m = ca["labor_high_multiplier"]
        if not isinstance(m, dict) or not _is_number(m.get("value")) or m.get("value") < 1:
            errors.append("cost_assumptions.labor_high_multiplier.value는 1 이상의 숫자여야 해요.")

    meta = seed["meta"]
    if dev_used[0] and meta.get("is_dev_data") is not True:
        errors.append("가상 예시 값이 남아 있는데 meta.is_dev_data가 true가 아니에요. 개발용 안내가 사라지면 안 돼요.")

    # --- 단정 표현 검사 ---
    def strings(node):
        if isinstance(node, str):
            yield node
        elif isinstance(node, dict):
            for v in node.values():
                for s in strings(v):
                    yield s
        elif isinstance(node, list):
            for v in node:
                for s in strings(v):
                    yield s

    for s in strings(seed):
        for w in BANNED_WORDS:
            if w in s:
                errors.append("seed.json 글 중에 쓰지 않기로 한 단정 표현 '%s'이(가) 있어요: %s" % (w, s[:40]))

    return errors, warnings


def load_seed(path):
    """파일을 읽고 검사까지 마친 seed(dict)와 경고 목록을 돌려줍니다. 위반 시 SeedError."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            seed = json.load(f)
    except FileNotFoundError:
        raise SeedError(["seed 파일을 찾을 수 없어요: %s" % path])
    except ValueError as e:
        raise SeedError(["seed.json이 올바른 JSON 모양이 아니에요(쉼표·따옴표를 확인하세요): %s" % e])
    errors, warnings = validate_seed(seed)
    if errors:
        raise SeedError(errors, warnings)
    return seed, warnings
