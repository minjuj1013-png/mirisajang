"""요청 값 검사 (DESIGN.md 3-2, 5-1, 5-3, 6-5). 문구는 화면 문구와 같게 맞춥니다."""
import math
import re

from lib.mask import mask_pii


class ApiError(Exception):
    def __init__(self, code, status, message, fields=None):
        Exception.__init__(self, message)
        self.code = code
        self.status = status
        self.message = message
        self.fields = fields

    def to_body(self):
        err = {"code": self.code, "message": self.message}
        if self.fields:
            err["fields"] = self.fields
        return {"error": err}


# 수정 가능 항목 (D2). key는 calc.OVERRIDE_KEYS와 같아야 합니다.
EDITABLE_FIELDS = [
    {"key": "monthly_sales", "label": "월 매출", "unit": "만 원", "min": 0, "max": 100000},
    {"key": "rent", "label": "월 임대료", "unit": "만 원", "min": 0, "max": 10000},
    {"key": "cogs_rate", "label": "재료비 비율", "unit": "%", "min": 0, "max": 90},
    {"key": "wage_per_staff", "label": "1인당 월 인건비", "unit": "만 원", "min": 0, "max": 2000},
]
STAFF_MIN, STAFF_MAX = 1, 10  # 일하는 사람 수(사장님 포함)
CAPITAL_MIN, CAPITAL_MAX = 500, 100000  # 보유 자본(만 원)
CAPITAL_MSG = "보유 자본을 만 원 단위로 적어 주세요(500~100,000)."
ALL_DISTRICT = "__all"

SESSION_RE = re.compile(r"^[A-Za-z0-9_\-]{8,64}$")
MAX_PROP_LEN = 50

EVENT_PROPS = {
    "page_view": ["screen"],
    "input_started": [],
    "field_set": ["field"],
    "input_error": ["fields"],
    "result_viewed": ["region", "choice", "status"],
    "override_changed": ["field"],
    "glossary_opened": ["term"],
    "sample_viewed": ["from"],
    "preorder_clicked": [],
    "recommend_viewed": ["region", "district", "fit_ok", "fit_tight", "fit_short", "fit_insufficient"],
    "brand_picked": ["brand_id"],
    "premium_viewed": ["from"],
    "premium_compare_viewed": ["from"],
}
NUMERIC_PROPS = ("fit_ok", "fit_tight", "fit_short", "fit_insufficient")  # 0~1000 정수만
SIMILARITY_ANSWERS = ("similar", "somewhat_different", "very_different", "unknown")
RESPONDENTS = ("preparing", "operating", "none")
FEEDBACK_TYPES = ("similarity", "blocked")
BLOCKED_TEXT_MAX = 500
SCREEN_RE = re.compile(r"^[A-Za-z0-9_\-]{1,20}$")


def _is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _need_object(body):
    if not isinstance(body, dict):
        raise ApiError("VALIDATION_ERROR", 400, "요청 형식이 올바르지 않아요. { } 모양의 JSON을 보내 주세요.")
    return body


def _check_capital(body, fields, out, required):
    cap = body.get("capital")
    if cap is None or cap == "":
        if required:
            fields["capital"] = CAPITAL_MSG
        return
    if (not _is_num(cap)) or int(cap) != cap or not (CAPITAL_MIN <= cap <= CAPITAL_MAX):
        fields["capital"] = CAPITAL_MSG
    else:
        out["capital"] = int(cap)


def _check_district_shape(body, fields, out):
    d = body.get("district")
    if d is None or d == "" or d == ALL_DISTRICT:
        return
    if not isinstance(d, str):
        fields["district"] = "시·군·구를 다시 골라 주세요."
    else:
        out["district"] = d


def _check_district_belongs(seed, out):
    """district가 고른 region의 하위인지 확인 (region이 목록에 있는 것을 확인한 뒤 호출)."""
    d = out.get("district")
    if d is None:
        return
    region = next(r for r in seed["regions"] if r.get("code") == out["region"])
    if not any(x.get("code") == d for x in region.get("districts") or []):
        raise ApiError("VALIDATION_ERROR", 400, "입력을 다시 확인해 주세요.",
                       {"district": "고른 시·군·구가 선택한 시·도에 없어요. 다시 골라 주세요."})


def _check_region_and_staff(body, fields, out):
    region = body.get("region")
    if region is None or region == "" or not isinstance(region, str):
        fields["region"] = "지역을 골라 주세요."
    else:
        out["region"] = region
    _check_staff(body, fields, out)


def _check_staff(body, fields, out):
    staff = body.get("staff")
    staff_msg = "일하는 사람 수를 골라 주세요. 사장님을 포함해서 1명 이상이에요."
    if staff is None or staff == "" or (_is_num(staff) and staff == 0):
        fields["staff"] = staff_msg
    elif (not _is_num(staff)) or int(staff) != staff or not (STAFF_MIN <= staff <= STAFF_MAX):
        fields["staff"] = "일하는 사람 수는 사장님을 포함해서 %d~%d명 사이의 정수로 골라 주세요." % (STAFF_MIN, STAFF_MAX)
    else:
        out["staff"] = int(staff)


def _check_region_known(seed, out):
    if not any(r.get("code") == out["region"] for r in seed["regions"]):
        raise ApiError("UNKNOWN_OPTION", 400, "목록에 없는 선택지예요.", {"region": "목록에 없는 지역이에요."})


def validate_recommend(seed, body):
    body = _need_object(body)
    fields, out = {}, {}
    _check_capital(body, fields, out, True)
    _check_region_and_staff(body, fields, out)
    _check_district_shape(body, fields, out)
    if fields:
        raise ApiError("VALIDATION_ERROR", 400, "입력을 다시 확인해 주세요.", fields)
    _check_region_known(seed, out)
    _check_district_belongs(seed, out)
    return out


def validate_estimate(seed, body):
    body = _need_object(body)
    fields = {}
    out = {}
    _check_capital(body, fields, out, False)
    _check_district_shape(body, fields, out)

    _check_region_and_staff(body, fields, out)

    brand_id = body.get("brand_id")
    level_id = body.get("royalty_level")
    has_brand = brand_id not in (None, "")
    has_level = level_id not in (None, "")
    if has_brand and has_level:
        fields["brand_or_level"] = "브랜드와 로열티 수준은 둘 중 하나만 골라 주세요."
    elif not has_brand and not has_level:
        fields["brand_or_level"] = "브랜드 또는 로열티 수준을 골라 주세요."
    elif has_brand:
        if isinstance(brand_id, str):
            out["brand_id"] = brand_id
        else:
            fields["brand_or_level"] = "브랜드를 골라 주세요."
    else:
        if isinstance(level_id, str):
            out["royalty_level"] = level_id
        else:
            fields["brand_or_level"] = "로열티 수준을 골라 주세요."

    overrides = body.get("overrides")
    clean_ov = {}
    if overrides is not None:
        if not isinstance(overrides, dict):
            fields["overrides"] = "수정한 값은 { } 모양이어야 해요."
        else:
            spec = dict((f["key"], f) for f in EDITABLE_FIELDS)
            for k, v in overrides.items():
                if k not in spec:
                    fields["overrides.%s" % k] = "수정할 수 없는 항목이에요."
                elif v is None or v == "":
                    continue  # 빈칸 = 수정 안 함
                elif not _is_num(v):
                    fields["overrides.%s" % k] = "숫자로 입력해 주세요."
                elif not (spec[k]["min"] <= v <= spec[k]["max"]):
                    fields["overrides.%s" % k] = "%s은(는) %s~%s%s 사이로 입력해 주세요." % (
                        spec[k]["label"], format(spec[k]["min"], ","), format(spec[k]["max"], ","), spec[k]["unit"])
                else:
                    clean_ov[k] = v
    out["overrides"] = clean_ov

    if fields:
        raise ApiError("VALIDATION_ERROR", 400, "입력을 다시 확인해 주세요.", fields)

    # 목록에 있는 값인지 (형식 검사를 모두 통과한 뒤에)
    unknown = {}
    if not any(r.get("code") == out["region"] for r in seed["regions"]):
        unknown["region"] = "목록에 없는 지역이에요."
    if "brand_id" in out and not any(b.get("id") == out["brand_id"] for b in seed["brands"]):
        unknown["brand_or_level"] = "목록에 없는 브랜드예요."
    if "royalty_level" in out and not any(x.get("id") == out["royalty_level"] for x in seed["royalty_levels"]):
        unknown["brand_or_level"] = "목록에 없는 로열티 수준이에요."
    if unknown:
        raise ApiError("UNKNOWN_OPTION", 400, "목록에 없는 선택지예요.", unknown)
    _check_district_belongs(seed, out)
    return out


def validate_session_id(body, fields):
    sid = body.get("session_id")
    if not isinstance(sid, str) or not SESSION_RE.match(sid):
        fields["session_id"] = "session_id는 8~64자의 영문·숫자·-·_ 이어야 해요."
        return None
    return sid


def _clean_prop_value(key, v, fields, prefix):
    if key in NUMERIC_PROPS:
        if not _is_num(v) or int(v) != v or not (0 <= v <= 1000):
            fields[prefix + key] = "0~1000 사이의 정수여야 해요."
            return None
        return int(v)
    if key == "fields":
        if not isinstance(v, list) or len(v) > 10 or not all(isinstance(x, str) and len(x) <= 30 for x in v):
            fields[prefix + key] = "항목 이름 목록(문자열 10개 이하)이어야 해요."
            return None
        return [mask_pii(x) for x in v]
    if not isinstance(v, str) or len(v) > MAX_PROP_LEN:
        fields[prefix + key] = "%d자 이하의 글자여야 해요." % MAX_PROP_LEN
        return None
    return mask_pii(v)


def validate_event(body):
    body = _need_object(body)
    fields = {}
    sid = validate_session_id(body, fields)
    name = body.get("name")
    if name not in EVENT_PROPS:
        fields["name"] = "허용되지 않은 이벤트 이름이에요."
    props_in = body.get("props")
    if props_in is None:
        props_in = {}
    props = {}
    if not isinstance(props_in, dict):
        fields["props"] = "props는 { } 모양이어야 해요."
    elif name in EVENT_PROPS:
        for k in EVENT_PROPS[name]:  # 정한 키만 저장, 나머지는 버림
            if k in props_in and props_in[k] is not None:
                val = _clean_prop_value(k, props_in[k], fields, "props.")
                if val is not None:
                    props[k] = val
    if fields:
        raise ApiError("VALIDATION_ERROR", 400, "기록 내용을 확인해 주세요.", fields)
    return sid, name, props


def validate_feedback(body):
    body = _need_object(body)
    fields = {}
    sid = validate_session_id(body, fields)
    ftype = body.get("type")
    props = {}
    if ftype not in FEEDBACK_TYPES:
        fields["type"] = "type은 similarity 또는 blocked여야 해요."
    elif ftype == "similarity":
        if body.get("answer") not in SIMILARITY_ANSWERS:
            fields["answer"] = "answer가 올바르지 않아요."
        else:
            props["answer"] = body["answer"]
        resp = body.get("respondent")
        if resp is not None:
            if resp not in RESPONDENTS:
                fields["respondent"] = "respondent가 올바르지 않아요."
            else:
                props["respondent"] = resp
    else:
        text = body.get("text")
        if not isinstance(text, str) or not text.strip():
            fields["text"] = "내용을 적어 주세요."
        elif len(text) > BLOCKED_TEXT_MAX:
            fields["text"] = "%d자까지 적을 수 있어요." % BLOCKED_TEXT_MAX
        else:
            props["text"] = mask_pii(text.strip())
        screen = body.get("screen")
        if screen is None:
            props["screen"] = "unknown"
        elif not isinstance(screen, str) or not SCREEN_RE.match(screen):
            fields["screen"] = "screen이 올바르지 않아요."
        else:
            props["screen"] = screen
    if fields:
        raise ApiError("VALIDATION_ERROR", 400, "의견 내용을 확인해 주세요.", fields)
    return sid, ftype, props


def validate_preorder(body):
    body = _need_object(body)
    fields = {}
    sid = validate_session_id(body, fields)
    ctx_in = body.get("context")
    ctx = {}
    if ctx_in is not None:
        if not isinstance(ctx_in, dict):
            fields["context"] = "context는 { } 모양이어야 해요."
        else:
            for k in ("region", "choice"):  # 이름·이메일 같은 다른 키는 저장하지 않음
                if k in ctx_in and ctx_in[k] is not None:
                    val = _clean_prop_value(k, ctx_in[k], fields, "context.")
                    if val is not None:
                        ctx[k] = val
    if fields:
        raise ApiError("VALIDATION_ERROR", 400, "신청 내용을 확인해 주세요.", fields)
    return sid, ctx
