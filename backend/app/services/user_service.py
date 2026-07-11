from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.activity import Activity
from app.models.audit_log import AuditAction, AuditLog
from app.models.notification import Notification
from app.models.opportunity import Opportunity, OpportunityStageHistory
from app.models.user import User, UserRole
from app.models.win_loss import WinLossAnalysis
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.utils.audit import log_audit
from app.utils.security import hash_password


def to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        mobile=user.mobile,
        role=user.role.value,
        is_active=user.is_active,
    )


def _user_audit_snapshot(user: User) -> dict:
    return {
        "name": user.name,
        "email": user.email,
        "mobile": user.mobile,
        "role": user.role.value,
        "is_active": user.is_active,
    }


async def list_users(db: AsyncSession) -> list[UserResponse]:
    result = await db.execute(select(User).order_by(User.name))
    return [to_response(u) for u in result.scalars().all()]


async def create_user(db: AsyncSession, current_user: User, body: UserCreate) -> UserResponse:
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise BadRequestError("این ایمیل قبلاً ثبت شده است")

    if body.mobile:
        mobile_taken = await db.execute(select(User).where(User.mobile == body.mobile))
        if mobile_taken.scalar_one_or_none():
            raise BadRequestError("این شماره موبایل قبلاً ثبت شده است")

    user = User(
        name=body.name,
        email=body.email,
        mobile=body.mobile,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await log_audit(
        db,
        "User",
        user.id,
        AuditAction.CREATE,
        current_user.id,
        _user_audit_snapshot(user),
    )
    await db.commit()
    await db.refresh(user)
    return to_response(user)


async def update_user(
    db: AsyncSession, current_user: User, user_id: str, body: UserUpdate
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("کاربر یافت نشد")

    before = _user_audit_snapshot(user)
    updates = body.model_dump(exclude_unset=True)
    if "mobile" in updates and updates["mobile"]:
        mobile_taken = await db.execute(
            select(User).where(User.mobile == updates["mobile"], User.id != user_id)
        )
        if mobile_taken.scalar_one_or_none():
            raise BadRequestError("این شماره موبایل قبلاً ثبت شده است")
    for field, value in updates.items():
        setattr(user, field, value)

    await log_audit(
        db,
        "User",
        user_id,
        AuditAction.UPDATE,
        current_user.id,
        {"before": before, "after": updates},
    )
    await db.commit()
    await db.refresh(user)
    return to_response(user)


async def reset_user_password(
    db: AsyncSession, current_user: User, user_id: str, new_password: str
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("کاربر یافت نشد")

    user.hashed_password = hash_password(new_password)
    await log_audit(
        db,
        "User",
        user_id,
        AuditAction.UPDATE,
        current_user.id,
        {"after": {"password_reset": True}, "email": user.email},
    )
    await db.commit()
    return {"message": "رمز عبور کاربر با موفقیت تغییر یافت"}


async def _count_user_references(db: AsyncSession, user_id: str) -> int:
    checks = [
        select(func.count()).select_from(Activity).where(Activity.created_by_id == user_id),
        select(func.count()).select_from(AuditLog).where(AuditLog.changed_by_id == user_id),
        select(func.count())
        .select_from(OpportunityStageHistory)
        .where(OpportunityStageHistory.changed_by_id == user_id),
        select(func.count()).select_from(WinLossAnalysis).where(WinLossAnalysis.analyzed_by_id == user_id),
    ]
    total = 0
    for stmt in checks:
        total += (await db.execute(stmt)).scalar_one()
    return total


async def delete_user(db: AsyncSession, current_user: User, user_id: str) -> None:
    if current_user.role != UserRole.MANAGER:
        raise ForbiddenError("فقط مدیر سیستم می‌تواند کاربر را حذف کند")

    if current_user.id == user_id:
        raise BadRequestError("امکان حذف حساب کاربری خودتان وجود ندارد")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("کاربر یافت نشد")

    if user.role == UserRole.MANAGER and user.is_active:
        active_managers = await db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.MANAGER,
                User.is_active.is_(True),
            )
        )
        if active_managers.scalar_one() <= 1:
            raise BadRequestError("امکان حذف آخرین مدیر فعال سیستم وجود ندارد")

    if await _count_user_references(db, user_id) > 0:
        raise ConflictError(
            "این کاربر در تاریخچه CRM ثبت شده است. "
            "به‌جای حذف، وضعیت کاربر را «غیرفعال» کنید."
        )

    snapshot = _user_audit_snapshot(user)
    await db.execute(delete(Notification).where(Notification.user_id == user_id))
    await db.execute(
        update(Account).where(Account.account_manager_id == user_id).values(account_manager_id=None)
    )
    await db.execute(
        update(Opportunity)
        .where(Opportunity.assigned_to_id == user_id)
        .values(assigned_to_id=None)
    )
    await log_audit(
        db,
        "User",
        user_id,
        AuditAction.DELETE,
        current_user.id,
        snapshot,
    )
    await db.delete(user)
    await db.commit()
