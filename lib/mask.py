"""개인정보처럼 보이는 글자를 [가림]으로 바꿉니다 (DESIGN.md 5-3 feedback)."""
import re

MASK = "[가림]"

_EMAIL = re.compile(r"[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+")
# 13자리(주민등록번호 모양): 6자리-7자리
_RRN = re.compile(r"(?<!\d)\d{6}[-\s]?\d{7}(?!\d)")
# 전화번호: 010-1234-5678, 01012345678, 02-123-4567, (02) 123-4567, +82 10-1234-5678
_PHONE = re.compile(r"(?<!\d)(?:\+82[-.\s]?\d{1,2}|\(?0\d{1,2}\)?)[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)")
# 10자리 이상 숫자열(계좌번호 모양). 숫자 사이 하이픈·공백 허용
_LONG_DIGITS = re.compile(r"(?<!\d)\d(?:[-\s]?\d){9,}(?!\d)")


def mask_pii(text):
    if not isinstance(text, str):
        return text
    for pat in (_EMAIL, _RRN, _PHONE, _LONG_DIGITS):
        text = pat.sub(MASK, text)
    return text
