from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction, AuditLog
from app.utils.datetime_utils import utc_now


def _json_safe(value):
    if value is None:
        return None
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def entity_summary(entity_type: str, change_data: dict | None) -> str | None:
    """Human-readable label for an audit row."""
    if not change_data:
        return None

    def pick(d: dict) -> str | None:
        for key in ("title", "name", "full_name", "email", "sales_stage", "activity_type"):
            val = d.get(key)
            if val is not None and val != "":
                return str(val)
        return None

    direct = pick(change_data)
    if direct:
        return direct

    after = change_data.get("after")
    if isinstance(after, dict):
        label = pick(after)
        if label:
            return label

    before = change_data.get("before")
    if isinstance(before, dict):
        return pick(before)

    return None


async def log_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: AuditAction,
    changed_by_id: str,
    change_data: dict | None = None,
) -> None:
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changed_by_id=changed_by_id,
        change_data=_json_safe(change_data or {}),
        created_at=utc_now(),
    )
    db.add(log)
    await db.flush()
