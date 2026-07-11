import re

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def normalize_mobile(value: str) -> str:
    v = value.strip()
    for i, p in enumerate(PERSIAN_DIGITS):
        v = v.replace(p, str(i))
    for i, p in enumerate(ARABIC_DIGITS):
        v = v.replace(p, str(i))
    v = re.sub(r"[\s\-()]", "", v)
    if v.startswith("+98"):
        v = "0" + v[3:]
    elif v.startswith("98") and len(v) == 12:
        v = "0" + v[2:]
    return v


def is_valid_iranian_mobile(value: str) -> bool:
    return bool(re.match(r"^09\d{9}$", normalize_mobile(value)))
