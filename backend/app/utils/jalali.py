import jdatetime


def to_jalali_str(dt) -> str:
    if not dt:
        return ""
    jdt = jdatetime.datetime.fromgregorian(datetime=dt)
    return jdt.strftime("%Y/%m/%d")


def from_jalali_str(jalali_str: str):
    parts = jalali_str.split("/")
    if len(parts) != 3:
        return None
    jy, jm, jd = map(int, parts)
    return jdatetime.datetime(jy, jm, jd).togregorian()
