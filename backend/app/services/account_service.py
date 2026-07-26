from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account, Industry, PriorityLevel, RelationshipStatus
from app.models.activity import Activity, activity_contacts
from app.models.audit_log import AuditAction, AuditLog
from app.models.contact import Contact
from app.models.opportunity import Opportunity, OpportunityStageHistory
from app.models.user import User, UserRole
from app.models.win_loss import WinLossAnalysis
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.services.access import ensure_account_access, get_account_or_404
from app.services.exceptions import ForbiddenError, NotFoundError
from app.utils.audit import log_audit
from app.utils.datetime_utils import as_utc_aware


def to_response(account: Account) -> AccountResponse:
    return AccountResponse(
        id=account.id,
        name=account.name,
        national_id=account.national_id,
        industry=account.industry,
        size=account.size,
        priority_level=account.priority_level,
        province=account.province,
        city=account.city,
        address=account.address,
        website=account.website,
        relationship_status=account.relationship_status,
        account_manager_id=account.account_manager_id,
        account_manager_name=account.account_manager.name if account.account_manager else None,
        created_at=account.created_at,
    )


async def _load_account(db: AsyncSession, account_id: str) -> Account:
    result = await db.execute(
        select(Account)
        .options(selectinload(Account.account_manager))
        .where(Account.id == account_id)
    )
    return result.scalar_one()


async def list_accounts(
    db: AsyncSession,
    current_user: User,
    *,
    search: str | None = None,
    industry: Industry | None = None,
    priority_level: PriorityLevel | None = None,
    relationship_status: RelationshipStatus | None = None,
    account_manager_id: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = select(Account).options(selectinload(Account.account_manager))

    if current_user.role == UserRole.EXPERT:
        query = query.where(Account.account_manager_id == current_user.id)
    elif account_manager_id:
        query = query.where(Account.account_manager_id == account_manager_id)

    if search:
        query = query.where(Account.name.ilike(f"%{search}%"))
    if industry:
        query = query.where(Account.industry == industry)
    if priority_level:
        query = query.where(Account.priority_level == priority_level)
    if relationship_status:
        query = query.where(Account.relationship_status == relationship_status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        query.order_by(Account.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    accounts = result.scalars().all()

    return {
        "items": [to_response(a) for a in accounts],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


async def create_account(db: AsyncSession, current_user: User, body: AccountCreate) -> AccountResponse:
    data = body.model_dump()
    if current_user.role == UserRole.EXPERT:
        data["account_manager_id"] = current_user.id

    account = Account(**data)
    db.add(account)
    await db.flush()
    await log_audit(db, "Account", account.id, AuditAction.CREATE, current_user.id, data)
    await db.commit()
    return to_response(await _load_account(db, account.id))


async def get_account(db: AsyncSession, current_user: User, account_id: str) -> AccountResponse:
    result = await db.execute(
        select(Account)
        .options(selectinload(Account.account_manager))
        .where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("سازمان یافت نشد")
    if current_user.role == UserRole.EXPERT and account.account_manager_id != current_user.id:
        raise ForbiddenError()
    return to_response(account)


async def update_account(
    db: AsyncSession, current_user: User, account_id: str, body: AccountUpdate
) -> AccountResponse:
    result = await db.execute(
        select(Account)
        .options(selectinload(Account.account_manager))
        .where(Account.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("سازمان یافت نشد")
    if current_user.role == UserRole.EXPERT and account.account_manager_id != current_user.id:
        raise ForbiddenError()

    old_data = {c.name: getattr(account, c.name) for c in account.__table__.columns}
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(account, field, value)

    await log_audit(
        db,
        "Account",
        account_id,
        AuditAction.UPDATE,
        current_user.id,
        {"before": old_data, "after": updates},
    )
    await db.commit()
    await db.refresh(account, ["account_manager"])
    return to_response(account)


async def delete_account(db: AsyncSession, current_user: User, account_id: str) -> None:
    account = await get_account_or_404(db, account_id)

    opp_ids = select(Opportunity.id).where(Opportunity.account_id == account_id)
    activity_ids = select(Activity.id).where(
        or_(Activity.account_id == account_id, Activity.opportunity_id.in_(opp_ids))
    )
    contact_ids = select(Contact.id).where(Contact.account_id == account_id)

    # Delete in dependency order so Postgres FKs do not block the account delete
    await db.execute(
        activity_contacts.delete().where(
            or_(
                activity_contacts.c.activity_id.in_(activity_ids),
                activity_contacts.c.contact_id.in_(contact_ids),
            )
        )
    )
    await db.execute(
        delete(Activity).where(
            or_(Activity.account_id == account_id, Activity.opportunity_id.in_(opp_ids))
        )
    )
    await db.execute(delete(WinLossAnalysis).where(WinLossAnalysis.opportunity_id.in_(opp_ids)))
    await db.execute(
        delete(OpportunityStageHistory).where(OpportunityStageHistory.opportunity_id.in_(opp_ids))
    )
    await db.execute(delete(Opportunity).where(Opportunity.account_id == account_id))
    await db.execute(
        update(Activity).where(Activity.contact_id.in_(contact_ids)).values(contact_id=None)
    )
    await db.execute(delete(Contact).where(Contact.account_id == account_id))

    await log_audit(db, "Account", account_id, AuditAction.DELETE, current_user.id, {})
    await db.delete(account)
    await db.commit()


async def get_audit_logs(db: AsyncSession, account_id: str) -> list[dict]:
    await get_account_or_404(db, account_id)

    logs_result = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.changed_by))
        .where(AuditLog.entity_type == "Account", AuditLog.entity_id == account_id)
        .order_by(AuditLog.created_at.desc())
    )
    logs = logs_result.scalars().all()
    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action.value,
            "changed_by_name": log.changed_by.name if log.changed_by else None,
            "change_data": log.change_data,
            "created_at": as_utc_aware(log.created_at).isoformat(),
        }
        for log in logs
    ]
