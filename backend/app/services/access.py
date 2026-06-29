from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.user import User, UserRole
from app.services.exceptions import ForbiddenError, NotFoundError


async def get_account_or_404(db: AsyncSession, account_id: str) -> Account:
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("سازمان یافت نشد")
    return account


async def ensure_account_access(db: AsyncSession, account_id: str, current_user: User) -> Account:
    account = await get_account_or_404(db, account_id)
    if current_user.role == UserRole.EXPERT and account.account_manager_id != current_user.id:
        raise ForbiddenError()
    return account


def is_manager(user: User) -> bool:
    return user.role == UserRole.MANAGER


def is_expert(user: User) -> bool:
    return user.role == UserRole.EXPERT
