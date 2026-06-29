import os
import uuid
from datetime import datetime

import aiofiles
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.activity import Activity, ActivityType
from app.models.audit_log import AuditAction
from app.models.user import User, UserRole
from app.schemas.activity import ActivityCreate, ActivityResponse, ActivityUpdate
from app.services.access import ensure_account_access
from app.models.notification import NotificationType
from app.services.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.services.notification_service import mark_entity_notifications_read
from app.utils.audit import log_audit
from app.utils.datetime_utils import to_naive_utc

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_SIZE = 10 * 1024 * 1024


def is_follow_up_overdue(activity: Activity) -> bool:
    if not activity.follow_up_date or activity.follow_up_completed:
        return False
    return activity.follow_up_date.replace(tzinfo=None) < datetime.utcnow()


def to_response(activity: Activity) -> ActivityResponse:
    return ActivityResponse(
        id=activity.id,
        account_id=activity.account_id,
        account_name=activity.account.name if activity.account else None,
        opportunity_id=activity.opportunity_id,
        opportunity_title=activity.opportunity.title if activity.opportunity else None,
        contact_id=activity.contact_id,
        contact_name=activity.contact.full_name if activity.contact else None,
        activity_type=activity.activity_type,
        activity_date=activity.activity_date,
        meeting_notes=activity.meeting_notes,
        outcome=activity.outcome,
        next_step=activity.next_step,
        follow_up_date=activity.follow_up_date,
        follow_up_completed=activity.follow_up_completed,
        attachment_url=activity.attachment_url,
        created_by_id=activity.created_by_id,
        created_by_name=activity.created_by.name if activity.created_by else None,
        is_follow_up_overdue=is_follow_up_overdue(activity),
        created_at=activity.created_at,
    )


def activity_query():
    return select(Activity).options(
        selectinload(Activity.account),
        selectinload(Activity.opportunity),
        selectinload(Activity.contact),
        selectinload(Activity.created_by),
    )


def apply_ownership(query, current_user: User):
    if current_user.role == UserRole.EXPERT:
        from app.models.account import Account

        query = query.join(Account).where(Account.account_manager_id == current_user.id)
    return query


async def _get_activity(db: AsyncSession, activity_id: str, current_user: User) -> Activity:
    result = await db.execute(activity_query().where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("فعالیت یافت نشد")
    if current_user.role == UserRole.EXPERT and activity.account.account_manager_id != current_user.id:
        raise ForbiddenError()
    return activity


async def overdue_count(db: AsyncSession, current_user: User) -> dict:
    query = apply_ownership(activity_query(), current_user).where(
        Activity.follow_up_date < datetime.utcnow(),
        Activity.follow_up_completed.is_(False),
    )
    if current_user.role == UserRole.EXPERT:
        query = query.where(Activity.created_by_id == current_user.id)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    return {"count": count}


async def upload_attachment(file: UploadFile) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequestError("فقط فایل‌های PDF، JPG و PNG مجاز هستند")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise BadRequestError("حجم فایل نباید بیشتر از ۱۰ مگابایت باشد")

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin"
    filename = f"{uuid.uuid4()}.{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    return {"url": f"/uploads/{filename}", "filename": file.filename}


async def list_activities(
    db: AsyncSession,
    current_user: User,
    *,
    account_id: str | None = None,
    opportunity_id: str | None = None,
    contact_id: str | None = None,
    activity_type: ActivityType | None = None,
    assigned_to: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    from_date = to_naive_utc(from_date)
    to_date = to_naive_utc(to_date)
    query = apply_ownership(activity_query(), current_user)

    if account_id:
        query = query.where(Activity.account_id == account_id)
    if opportunity_id:
        query = query.where(Activity.opportunity_id == opportunity_id)
    if contact_id:
        query = query.where(Activity.contact_id == contact_id)
    if activity_type:
        query = query.where(Activity.activity_type == activity_type)
    if assigned_to:
        query = query.where(Activity.created_by_id == assigned_to)
    elif current_user.role == UserRole.EXPERT:
        query = query.where(Activity.created_by_id == current_user.id)
    if from_date:
        query = query.where(Activity.activity_date >= from_date)
    if to_date:
        query = query.where(Activity.activity_date <= to_date)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(Activity.activity_date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    activities = result.scalars().unique().all()

    return {
        "items": [to_response(a) for a in activities],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def create_activity(
    db: AsyncSession, current_user: User, body: ActivityCreate
) -> ActivityResponse:
    await ensure_account_access(db, body.account_id, current_user)
    data = body.model_dump()
    activity = Activity(**data, created_by_id=current_user.id)
    db.add(activity)
    await db.flush()
    await log_audit(db, "Activity", activity.id, AuditAction.CREATE, current_user.id, data)
    await db.commit()

    result = await db.execute(activity_query().where(Activity.id == activity.id))
    return to_response(result.scalar_one())


async def get_activity(db: AsyncSession, current_user: User, activity_id: str) -> ActivityResponse:
    activity = await _get_activity(db, activity_id, current_user)
    return to_response(activity)


async def update_activity(
    db: AsyncSession, current_user: User, activity_id: str, body: ActivityUpdate
) -> ActivityResponse:
    activity = await _get_activity(db, activity_id, current_user)
    updates = body.model_dump(exclude_unset=True)

    if "account_id" in updates and updates["account_id"]:
        await ensure_account_access(db, updates["account_id"], current_user)

    old_data = {c.name: getattr(activity, c.name) for c in activity.__table__.columns}
    for field, value in updates.items():
        setattr(activity, field, value)

    await log_audit(
        db,
        "Activity",
        activity_id,
        AuditAction.UPDATE,
        current_user.id,
        {
            "before": old_data,
            "after": updates,
            "title": activity.meeting_notes[:80] if activity.meeting_notes else activity.activity_type.value,
        },
    )
    await db.commit()
    await db.refresh(activity, ["account", "opportunity", "contact", "created_by"])
    return to_response(activity)


async def complete_followup(
    db: AsyncSession, current_user: User, activity_id: str
) -> ActivityResponse:
    activity = await _get_activity(db, activity_id, current_user)
    activity.follow_up_completed = True
    await log_audit(
        db,
        "Activity",
        activity_id,
        AuditAction.UPDATE,
        current_user.id,
        {
            "before": {"follow_up_completed": False},
            "after": {"follow_up_completed": True},
            "title": activity.meeting_notes[:80] if activity.meeting_notes else activity.activity_type.value,
        },
    )
    await mark_entity_notifications_read(
        db,
        current_user.id,
        "Activity",
        activity_id,
        [NotificationType.OVERDUE_FOLLOWUP, NotificationType.UPCOMING_FOLLOWUP],
    )
    await db.commit()
    await db.refresh(activity, ["account", "opportunity", "contact", "created_by"])
    return to_response(activity)


async def delete_activity(db: AsyncSession, current_user: User, activity_id: str) -> None:
    result = await db.execute(activity_query().where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("فعالیت یافت نشد")
    await log_audit(db, "Activity", activity_id, AuditAction.DELETE, current_user.id, {})
    await db.delete(activity)
    await db.commit()
