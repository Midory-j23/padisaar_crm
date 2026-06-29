from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditAction
from app.models.user import User
from app.schemas.user import ChangePasswordRequest, LoginRequest
from app.services.exceptions import BadRequestError, UnauthorizedError
from app.utils.audit import log_audit
from app.utils.security import create_access_token, hash_password, verify_password


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
    }


async def login(db: AsyncSession, body: LoginRequest) -> dict:
    result = await db.execute(
        select(User).where(User.email == body.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedError("ایمیل یا رمز عبور اشتباه است")

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {
        "access_token": token,
        "user": user_to_dict(user),
    }


async def change_password(
    db: AsyncSession, current_user: User, body: ChangePasswordRequest
) -> dict:
    if not verify_password(body.current_password, current_user.hashed_password):
        raise BadRequestError("رمز عبور فعلی اشتباه است")
    current_user.hashed_password = hash_password(body.new_password)
    await log_audit(
        db,
        "User",
        current_user.id,
        AuditAction.UPDATE,
        current_user.id,
        {"after": {"password_changed": True}, "email": current_user.email},
    )
    await db.commit()
    return {"message": "رمز عبور با موفقیت تغییر یافت"}


async def list_active_users(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(User).where(User.is_active.is_(True)).order_by(User.name)
    )
    users = result.scalars().all()
    return [user_to_dict(u) for u in users]
