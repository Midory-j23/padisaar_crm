from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.activity import Activity
from app.models.notification import Notification, NotificationType
from app.models.opportunity import Opportunity, SalesStage
from app.models.user import User, UserRole
from app.services.auth_service import DEFAULT_NOTIFICATION_PREFS
from app.schemas.notification import NotificationResponse
from app.schemas.opportunity import CLOSED_STAGES
from app.services.exceptions import ForbiddenError, NotFoundError


def to_response(notification: Notification) -> NotificationResponse:
    return NotificationResponse.model_validate(notification)


async def mark_entity_notifications_read(
    db: AsyncSession,
    user_id: str,
    entity_type: str,
    entity_id: str,
    types: list[NotificationType] | None = None,
) -> None:
    query = select(Notification).where(
        Notification.user_id == user_id,
        Notification.entity_type == entity_type,
        Notification.entity_id == entity_id,
        Notification.is_read.is_(False),
    )
    if types:
        query = query.where(Notification.type.in_(types))
    result = await db.execute(query)
    for notification in result.scalars().all():
        notification.is_read = True


def _pref_enabled(user: User, ntype: NotificationType) -> bool:
    prefs = {**DEFAULT_NOTIFICATION_PREFS, **(user.notification_prefs or {})}
    return prefs.get(ntype.value, True)


async def create_notification_if_not_exists(
    db: AsyncSession,
    user_or_id: User | str,
    ntype: NotificationType,
    entity_type: str,
    entity_id: str,
    title: str,
    message: str,
) -> None:
    if isinstance(user_or_id, str):
        result = await db.execute(select(User).where(User.id == user_or_id))
        user = result.scalar_one_or_none()
        if not user:
            return
    else:
        user = user_or_id
    if not _pref_enabled(user, ntype):
        return
    existing = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id,
            Notification.type == ntype,
            Notification.entity_id == entity_id,
            Notification.is_read.is_(False),
        )
    )
    if not existing.scalar_one_or_none():
        db.add(
            Notification(
                user_id=user.id,
                type=ntype,
                entity_type=entity_type,
                entity_id=entity_id,
                title=title,
                message=message,
            )
        )


async def generate_notifications(db: AsyncSession, user: User) -> dict:
    now = datetime.utcnow()
    upcoming_end = now + timedelta(hours=24)
    at_risk_threshold = now + timedelta(days=14)
    pending_threshold = now - timedelta(days=3)
    assignment_window = now - timedelta(days=7)

    # 1. Overdue follow-ups
    overdue_result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.account))
        .where(
            Activity.follow_up_date < now,
            Activity.follow_up_completed.is_(False),
            Activity.created_by_id == user.id,
        )
    )
    for act in overdue_result.scalars().all():
        account_name = act.account.name if act.account else "سازمان"
        await create_notification_if_not_exists(
            db,
            user,
            NotificationType.OVERDUE_FOLLOWUP,
            "Activity",
            act.id,
            title="پیگیری معوق",
            message=f"پیگیری ثبت‌شده برای {account_name} انجام نشده است",
        )

    # 2. Upcoming follow-ups (within 24 hours)
    upcoming_result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.account))
        .where(
            Activity.follow_up_date >= now,
            Activity.follow_up_date <= upcoming_end,
            Activity.follow_up_completed.is_(False),
            Activity.created_by_id == user.id,
        )
    )
    for act in upcoming_result.scalars().all():
        account_name = act.account.name if act.account else "سازمان"
        await create_notification_if_not_exists(
            db,
            user,
            NotificationType.UPCOMING_FOLLOWUP,
            "Activity",
            act.id,
            title="پیگیری نزدیک",
            message=f"پیگیری برای {account_name} تا ۲۴ ساعت آینده سررسید می‌شود",
        )

    # 3. At-risk opportunities (close date within 14 days)
    at_risk_query = (
        select(Opportunity)
        .options(selectinload(Opportunity.account))
        .where(
            Opportunity.sales_stage.notin_(CLOSED_STAGES),
            Opportunity.expected_close_date.isnot(None),
            Opportunity.expected_close_date < at_risk_threshold,
        )
    )
    if user.role == UserRole.EXPERT:
        at_risk_query = at_risk_query.where(Opportunity.assigned_to_id == user.id)

    at_risk_result = await db.execute(at_risk_query)
    for opp in at_risk_result.scalars().all():
        await create_notification_if_not_exists(
            db,
            user,
            NotificationType.AT_RISK_OPPORTUNITY,
            "Opportunity",
            opp.id,
            title="فرصت در خطر",
            message=f"فرصت «{opp.title}» نزدیک به تاریخ بسته‌شدن است",
        )

    # 4. Pending win/loss (closed > 3 days without analysis)
    pending_query = (
        select(Opportunity)
        .options(selectinload(Opportunity.account), selectinload(Opportunity.win_loss))
        .where(
            Opportunity.sales_stage.in_([SalesStage.CLOSED_WON, SalesStage.CLOSED_LOST]),
            Opportunity.updated_at < pending_threshold,
        )
    )
    if user.role == UserRole.EXPERT:
        pending_query = pending_query.where(Opportunity.assigned_to_id == user.id)

    pending_result = await db.execute(pending_query)
    for opp in pending_result.scalars().unique().all():
        if opp.win_loss is not None:
            continue
        await create_notification_if_not_exists(
            db,
            user,
            NotificationType.PENDING_WIN_LOSS,
            "Opportunity",
            opp.id,
            title="تحلیل برد/باخت منتظر",
            message=f"فرصت «{opp.title}» بسته شده اما تحلیل برد/باخت ثبت نشده است",
        )

    # 5. New assignments (recently assigned opportunities)
    if user.role == UserRole.EXPERT:
        assignment_query = select(Opportunity).where(
            Opportunity.assigned_to_id == user.id,
            Opportunity.updated_at >= assignment_window,
        )
        assignment_result = await db.execute(assignment_query)
        for opp in assignment_result.scalars().all():
            await create_notification_if_not_exists(
                db,
                user,
                NotificationType.NEW_ASSIGNMENT,
                "Opportunity",
                opp.id,
                title="اختصاص جدید",
                message=f"فرصت «{opp.title}» به شما اختصاص داده شد",
            )

    await db.commit()
    count = await unread_count(db, user.id)
    return {"generated": True, "unread_count": count["count"]}


async def list_notifications(
    db: AsyncSession,
    user_id: str,
    *,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = select(Notification).where(Notification.user_id == user_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    items = [to_response(n) for n in result.scalars().all()]

    return {"items": items, "total": total, "page": page, "per_page": per_page}


async def unread_count(db: AsyncSession, user_id: str) -> dict:
    count = (
        await db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
        )
    ).scalar() or 0
    return {"count": count}


async def mark_read(db: AsyncSession, user_id: str, notification_id: str) -> NotificationResponse:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("اعلان یافت نشد")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return to_response(notification)


async def mark_all_read(db: AsyncSession, user_id: str) -> dict:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    for notification in result.scalars().all():
        notification.is_read = True
    await db.commit()
    return {"message": "همه اعلان‌ها خوانده شدند"}


async def get_notification(db: AsyncSession, user_id: str, notification_id: str) -> Notification:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise NotFoundError("اعلان یافت نشد")
    return notification


async def ensure_notification_access(
    db: AsyncSession, user_id: str, notification_id: str
) -> Notification:
    notification = await get_notification(db, user_id, notification_id)
    if notification.user_id != user_id:
        raise ForbiddenError()
    return notification
