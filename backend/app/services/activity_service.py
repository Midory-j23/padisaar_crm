import os
import uuid
from datetime import datetime

import aiofiles
from fastapi import UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.activity import Activity, ActivityType
from app.models.audit_log import AuditAction
from app.models.contact import Contact
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


def _contact_ids_from_activity(activity: Activity) -> list[str]:
    if activity.contacts:
        return [c.id for c in activity.contacts]
    if activity.contact_id:
        return [activity.contact_id]
    return []


def _contact_names_from_activity(activity: Activity) -> list[str]:
    if activity.contacts:
        return [c.full_name for c in activity.contacts]
    if activity.contact and activity.contact.full_name:
        return [activity.contact.full_name]
    return []


def to_response(activity: Activity) -> ActivityResponse:
    contact_ids = _contact_ids_from_activity(activity)
    contact_names = _contact_names_from_activity(activity)
    return ActivityResponse(
        id=activity.id,
        account_id=activity.account_id,
        account_name=activity.account.name if activity.account else None,
        opportunity_id=activity.opportunity_id,
        opportunity_title=activity.opportunity.title if activity.opportunity else None,
        contact_id=contact_ids[0] if contact_ids else activity.contact_id,
        contact_name=contact_names[0] if contact_names else None,
        contact_ids=contact_ids,
        contact_names=contact_names,
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
        selectinload(Activity.contacts),
        selectinload(Activity.created_by),
    )


def apply_ownership(query, current_user: User):
    if current_user.role == UserRole.EXPERT:
        from app.models.account import Account

        query = query.join(Account).where(Account.account_manager_id == current_user.id)
    return query


def _overdue_base_query(current_user: User):
    query = apply_ownership(activity_query(), current_user).where(
        Activity.follow_up_date < datetime.utcnow(),
        Activity.follow_up_completed.is_(False),
    )
    if current_user.role == UserRole.EXPERT:
        query = query.where(Activity.created_by_id == current_user.id)
    return query


async def _validate_contact_ids(
    db: AsyncSession, account_id: str, contact_ids: list[str], current_user: User
) -> list[Contact]:
    if not contact_ids:
        return []
    result = await db.execute(select(Contact).where(Contact.id.in_(contact_ids)))
    contacts = result.scalars().all()
    if len(contacts) != len(set(contact_ids)):
        raise BadRequestError("یک یا چند مخاطب انتخاب‌شده یافت نشد")
    for contact in contacts:
        if contact.account_id != account_id:
            raise BadRequestError("مخاطب باید متعلق به همان سازمان باشد")
        if current_user.role == UserRole.EXPERT:
            from app.models.account import Account

            acc = await db.get(Account, account_id)
            if not acc or acc.account_manager_id != current_user.id:
                raise ForbiddenError()
    return contacts


def _resolve_contact_ids(body: ActivityCreate | ActivityUpdate, existing: Activity | None = None) -> list[str]:
    if isinstance(body, ActivityUpdate):
        if body.contact_ids is not None:
            return body.contact_ids
        if body.contact_id is not None:
            return [body.contact_id] if body.contact_id else []
        return _contact_ids_from_activity(existing) if existing else []
    ids = list(body.contact_ids or [])
    if body.contact_id and body.contact_id not in ids:
        ids.insert(0, body.contact_id)
    elif not ids and body.contact_id:
        ids = [body.contact_id]
    return ids


async def _get_activity(db: AsyncSession, activity_id: str, current_user: User) -> Activity:
    result = await db.execute(activity_query().where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("فعالیت یافت نشد")
    if current_user.role == UserRole.EXPERT and activity.account.account_manager_id != current_user.id:
        raise ForbiddenError()
    return activity


async def overdue_count(db: AsyncSession, current_user: User) -> dict:
    query = _overdue_base_query(current_user)
    count = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    return {"count": count}


async def list_overdue(
    db: AsyncSession, current_user: User, *, limit: int = 50
) -> dict:
    count_result = await overdue_count(db, current_user)
    query = _overdue_base_query(current_user).order_by(Activity.follow_up_date.asc()).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().unique().all()
    items = [to_response(a) for a in activities]
    return {"count": count_result["count"], "items": items}


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
        query = query.where(
            or_(
                Activity.contact_id == contact_id,
                Activity.contacts.any(Contact.id == contact_id),
            )
        )
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
    contact_ids = _resolve_contact_ids(body)
    contacts = await _validate_contact_ids(db, body.account_id, contact_ids, current_user)

    data = body.model_dump(exclude={"contact_ids"})
    data["contact_id"] = contact_ids[0] if contact_ids else None
    activity = Activity(**data, created_by_id=current_user.id)
    activity.contacts = contacts
    db.add(activity)
    await db.flush()
    audit_data = {**data, "contact_ids": contact_ids}
    await log_audit(db, "Activity", activity.id, AuditAction.CREATE, current_user.id, audit_data)
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
    updates = body.model_dump(exclude_unset=True, exclude={"contact_ids"})
    account_id = updates.get("account_id", activity.account_id)

    contact_ids = _resolve_contact_ids(body, activity)
    if body.contact_ids is not None or body.contact_id is not None:
        contacts = await _validate_contact_ids(db, account_id, contact_ids, current_user)
        activity.contacts = contacts
        updates["contact_id"] = contact_ids[0] if contact_ids else None

    if "account_id" in updates and updates["account_id"]:
        await ensure_account_access(db, updates["account_id"], current_user)

    old_data = {c.name: getattr(activity, c.name) for c in activity.__table__.columns}
    for field, value in updates.items():
        setattr(activity, field, value)

    audit_after = {**updates}
    if body.contact_ids is not None or body.contact_id is not None:
        audit_after["contact_ids"] = contact_ids

    await log_audit(
        db,
        "Activity",
        activity_id,
        AuditAction.UPDATE,
        current_user.id,
        {
            "before": old_data,
            "after": audit_after,
            "title": activity.meeting_notes[:80] if activity.meeting_notes else activity.activity_type.value,
        },
    )
    await db.commit()
    await db.refresh(activity, ["account", "opportunity", "contact", "contacts", "created_by"])
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
    await db.refresh(activity, ["account", "opportunity", "contact", "contacts", "created_by"])
    return to_response(activity)


async def delete_activity(db: AsyncSession, current_user: User, activity_id: str) -> None:
    result = await db.execute(activity_query().where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("فعالیت یافت نشد")
    await log_audit(db, "Activity", activity_id, AuditAction.DELETE, current_user.id, {})
    await db.delete(activity)
    await db.commit()
