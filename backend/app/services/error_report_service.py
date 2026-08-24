import hashlib

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.error_report import ErrorReport, ErrorStatus
from app.models.user import User
from app.schemas.error_report import ErrorReportCreate, ErrorReportResponse
from app.services.exceptions import NotFoundError
from app.utils.datetime_utils import utc_now


def make_fingerprint(
    source: str,
    message: str,
    path: str | None,
    status_code: int | None,
) -> str:
    raw = f"{source}|{status_code or ''}|{path or ''}|{(message or '')[:400]}"
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()[:32]


def to_response(row: ErrorReport) -> ErrorReportResponse:
    return ErrorReportResponse(
        id=row.id,
        fingerprint=row.fingerprint,
        source=row.source,
        status=row.status,
        message=row.message,
        stack=row.stack,
        path=row.path,
        method=row.method,
        status_code=row.status_code,
        user_id=row.user_id,
        user_name=row.user.name if row.user else None,
        user_agent=row.user_agent,
        app_version=row.app_version,
        occurrence_count=row.occurrence_count,
        extra=row.extra or {},
        created_at=row.created_at,
        last_seen_at=row.last_seen_at,
        resolved_at=row.resolved_at,
        resolved_by_name=row.resolved_by.name if row.resolved_by else None,
    )


async def record_error(
    db: AsyncSession,
    body: ErrorReportCreate,
    *,
    user_id: str | None = None,
) -> ErrorReport:
    message = (body.message or "").strip()[:2000] or "Unknown error"
    stack = (body.stack or None)
    if stack:
        stack = stack[:8000]
    path = (body.path or None)
    if path:
        path = path[:500]

    fingerprint = make_fingerprint(body.source, message, path, body.status_code)
    now = utc_now()

    result = await db.execute(
        select(ErrorReport)
        .options(selectinload(ErrorReport.user), selectinload(ErrorReport.resolved_by))
        .where(
            ErrorReport.fingerprint == fingerprint,
            ErrorReport.status == ErrorStatus.OPEN.value,
        )
        .limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.occurrence_count = (existing.occurrence_count or 1) + 1
        existing.last_seen_at = now
        if stack and not existing.stack:
            existing.stack = stack
        if user_id and not existing.user_id:
            existing.user_id = user_id
        if body.user_agent and not existing.user_agent:
            existing.user_agent = body.user_agent[:500]
        await db.flush()
        return existing

    row = ErrorReport(
        fingerprint=fingerprint,
        source=body.source,
        status=ErrorStatus.OPEN.value,
        message=message,
        stack=stack,
        path=path,
        method=(body.method or None),
        status_code=body.status_code,
        user_id=user_id,
        user_agent=(body.user_agent[:500] if body.user_agent else None),
        app_version=body.app_version,
        occurrence_count=1,
        extra=body.extra or {},
        created_at=now,
        last_seen_at=now,
    )
    db.add(row)
    await db.flush()
    return row


async def list_errors(
    db: AsyncSession,
    *,
    status: str | None = None,
    source: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = select(ErrorReport).options(
        selectinload(ErrorReport.user),
        selectinload(ErrorReport.resolved_by),
    )
    if status:
        query = query.where(ErrorReport.status == status)
    if source:
        query = query.where(ErrorReport.source == source)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(ErrorReport.last_seen_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    items = result.scalars().all()
    return {
        "items": [to_response(row) for row in items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def open_count(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ErrorReport)
        .where(ErrorReport.status == ErrorStatus.OPEN.value)
    )
    return result.scalar() or 0


async def get_error(db: AsyncSession, error_id: str) -> ErrorReport:
    result = await db.execute(
        select(ErrorReport)
        .options(selectinload(ErrorReport.user), selectinload(ErrorReport.resolved_by))
        .where(ErrorReport.id == error_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise NotFoundError("گزارش خطا یافت نشد")
    return row


async def resolve_error(db: AsyncSession, error_id: str, current_user: User) -> ErrorReportResponse:
    result = await db.execute(
        select(ErrorReport)
        .options(selectinload(ErrorReport.user), selectinload(ErrorReport.resolved_by))
        .where(ErrorReport.id == error_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise NotFoundError("گزارش خطا یافت نشد")

    row.status = ErrorStatus.RESOLVED.value
    row.resolved_at = utc_now()
    row.resolved_by_id = current_user.id
    await db.commit()

    result = await db.execute(
        select(ErrorReport)
        .options(selectinload(ErrorReport.user), selectinload(ErrorReport.resolved_by))
        .where(ErrorReport.id == error_id)
    )
    return to_response(result.scalar_one())
