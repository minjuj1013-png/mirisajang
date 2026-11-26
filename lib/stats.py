"""팀용 지표 계산 (DESIGN.md 5-5). 같은 세션은 몇 번을 보내도 1로 셉니다."""
from lib.store import now_iso


FIELD_LABELS = {
    "capital": "보유 자본",
    "region": "시·도",
    "district": "시·군·구",
    "staff": "일하는 사람 수",
    "brand_or_level": "브랜드/로열티 수준(옛 입력)",
}


def _ratio(num, den):
    return round(num / den, 3) if den else None


def compute_stats(store):
    events = store.read("events")
    feedback = store.read("feedback")
    preorders = store.read("preorders")

    def sessions(records, name=None):
        return set(r.get("session_id") for r in records
                   if r.get("session_id") and (name is None or r.get("name") == name))

    started = sessions(events, "input_started")
    errored = sessions(events, "input_error")
    viewed = sessions(events, "result_viewed")
    m1 = len(viewed)
    recommend_viewed = sessions(events, "recommend_viewed")
    brand_picked = sessions(events, "brand_picked")
    m2 = len(sessions(preorders))

    # (3) 세션마다 마지막 similarity 응답만 센다
    last_sim = {}
    for r in feedback:
        if r.get("name") == "similarity" and r.get("session_id"):
            last_sim[r["session_id"]] = r.get("props") or {}
    answered = len(last_sim)
    excl_unknown = [p for p in last_sim.values() if p.get("answer") != "unknown"]
    similar = sum(1 for p in excl_unknown if p.get("answer") == "similar")

    by_resp = {}
    for p in last_sim.values():
        key = p.get("respondent") or "unspecified"
        g = by_resp.setdefault(key, {"similar": 0, "answered": 0, "answered_excl_unknown": 0, "rate": None})
        g["answered"] += 1
        if p.get("answer") != "unknown":
            g["answered_excl_unknown"] += 1
            if p.get("answer") == "similar":
                g["similar"] += 1
    for g in by_resp.values():
        g["rate"] = _ratio(g["similar"], g["answered_excl_unknown"])

    # 중간 이탈: input_started는 있고 result_viewed는 없는 세션의 마지막 field_set 항목
    last_field = {}
    for r in events:
        if r.get("name") == "field_set" and r.get("session_id"):
            fld = (r.get("props") or {}).get("field")
            if fld:
                last_field[r["session_id"]] = fld
    dropoff = dict((k, 0) for k in FIELD_LABELS)
    for sid in started - viewed:
        fld = last_field.get(sid, "none")
        dropoff[fld] = dropoff.get(fld, 0) + 1

    blocked = []
    for r in feedback:
        if r.get("name") == "blocked":
            p = r.get("props") or {}
            blocked.append({"ts": r.get("ts"), "screen": p.get("screen"), "text": p.get("text")})
    blocked.reverse()  # 최근 것이 먼저

    all_ts = [r.get("ts") for r in events + feedback + preorders if r.get("ts")]
    return {
        "period": {"from": min(all_ts) if all_ts else None, "to": now_iso()},
        "m1_completed_sessions": m1,
        "m1_completion_rate_of_started": _ratio(len(viewed & started), len(started)),
        "recommend_viewed_sessions": len(recommend_viewed),
        "brand_picked_sessions": len(brand_picked),
        "premium_viewed_sessions": len(sessions(events, "premium_viewed")),
        "premium_compare_viewed_sessions": len(sessions(events, "premium_compare_viewed")),
        "m2_preorder_sessions": m2,
        "m2_rate_of_m1": _ratio(m2, m1),
        "m3_similar": similar,
        "m3_answered": answered,
        "m3_answered_excl_unknown": len(excl_unknown),
        "m3_rate": _ratio(similar, len(excl_unknown)),
        "m3_rate_of_all_answered": _ratio(similar, answered),
        "m3_by_respondent": by_resp,
        "funnel": {"input_started": len(started), "input_error": len(errored), "result_viewed": m1},
        "dropoff_last_field": dropoff,
        "field_labels": dict(FIELD_LABELS),
        "blocked_reports": blocked[:100],
    }
