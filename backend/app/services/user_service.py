from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.exceptions import BadRequestError, NotFoundError
from app.utils.audit import log_audit
from app.utils.security import hash_password


def to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
    )


def _user_audit_snapshot(user: User) -> dict:
    return {
        "name": user.name,
        "email": user.email,
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

    user = User(
        name=body.name,
        email=body.email,
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
