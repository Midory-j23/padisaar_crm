from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditAction
from app.models.contact import Contact, InfluenceLevel, Sentiment
from app.models.user import User, UserRole
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate, normalize_mobile
from app.services.access import ensure_account_access
from app.services.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.utils.audit import log_audit


def to_response(contact: Contact) -> ContactResponse:
    return ContactResponse(
        id=contact.id,
        account_id=contact.account_id,
        account_name=contact.account.name if contact.account else None,
        full_name=contact.full_name,
        job_title=contact.job_title,
        department=contact.department,
        mobile=contact.mobile,
        direct_line=contact.direct_line,
        email=contact.email,
        influence_level=contact.influence_level,
        sentiment=contact.sentiment,
        created_at=contact.created_at,
    )


def _base_query(current_user: User):
    query = select(Contact).options(selectinload(Contact.account))
    if current_user.role == UserRole.EXPERT:
        from app.models.account import Account

        query = query.join(Account).where(Account.account_manager_id == current_user.id)
    return query


async def _get_contact_with_access(db: AsyncSession, contact_id: str, current_user: User) -> Contact:
    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.account))
        .where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("مخاطب یافت نشد")
    if current_user.role == UserRole.EXPERT and contact.account.account_manager_id != current_user.id:
        raise ForbiddenError()
    return contact


async def list_contacts(
    db: AsyncSession,
    current_user: User,
    *,
    search: str | None = None,
    account_id: str | None = None,
    influence_level: InfluenceLevel | None = None,
    sentiment: Sentiment | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = _base_query(current_user)

    if account_id:
        query = query.where(Contact.account_id == account_id)
    if influence_level:
        query = query.where(Contact.influence_level == influence_level)
    if sentiment:
        query = query.where(Contact.sentiment == sentiment)
    if search:
        query = query.where(
            or_(
                Contact.full_name.ilike(f"%{search}%"),
                Contact.mobile.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(Contact.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    contacts = result.scalars().all()

    return {
        "items": [to_response(c) for c in contacts],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def create_contact(db: AsyncSession, current_user: User, body: ContactCreate) -> ContactResponse:
    await ensure_account_access(db, body.account_id, current_user)

    mobile = normalize_mobile(body.mobile)
    dup = await db.execute(select(Contact).where(Contact.mobile == mobile))
    if dup.scalar_one_or_none():
        raise BadRequestError("این شماره موبایل قبلاً در سیستم ثبت شده است")

    data = body.model_dump()
    data["mobile"] = mobile
    contact = Contact(**data)
    db.add(contact)
    await db.flush()
    await log_audit(db, "Contact", contact.id, AuditAction.CREATE, current_user.id, data)
    await db.commit()

    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.account))
        .where(Contact.id == contact.id)
    )
    return to_response(result.scalar_one())


async def get_contact(db: AsyncSession, current_user: User, contact_id: str) -> ContactResponse:
    contact = await _get_contact_with_access(db, contact_id, current_user)
    return to_response(contact)


async def update_contact(
    db: AsyncSession, current_user: User, contact_id: str, body: ContactUpdate
) -> ContactResponse:
    contact = await _get_contact_with_access(db, contact_id, current_user)

    updates = body.model_dump(exclude_unset=True)
    if "account_id" in updates and updates["account_id"]:
        await ensure_account_access(db, updates["account_id"], current_user)

    if "mobile" in updates and updates["mobile"]:
        mobile = normalize_mobile(updates["mobile"])
        dup = await db.execute(
            select(Contact).where(Contact.mobile == mobile, Contact.id != contact_id)
        )
        if dup.scalar_one_or_none():
            raise BadRequestError("این شماره موبایل قبلاً در سیستم ثبت شده است")
        updates["mobile"] = mobile

    old_data = {c.name: getattr(contact, c.name) for c in contact.__table__.columns}
    for field, value in updates.items():
        setattr(contact, field, value)

    await log_audit(
        db,
        "Contact",
        contact_id,
        AuditAction.UPDATE,
        current_user.id,
        {"before": old_data, "after": updates},
    )
    await db.commit()
    await db.refresh(contact, ["account"])
    return to_response(contact)


async def delete_contact(db: AsyncSession, current_user: User, contact_id: str) -> None:
    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.account))
        .where(Contact.id == contact_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("مخاطب یافت نشد")

    await log_audit(db, "Contact", contact_id, AuditAction.DELETE, current_user.id, {})
    await db.delete(contact)
    await db.commit()
