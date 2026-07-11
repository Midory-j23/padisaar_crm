import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.login_otp import LoginOtp
from app.models.user import User
from app.schemas.user import SendOtpRequest, VerifyOtpRequest
from app.services.auth_service import user_to_dict
from app.services.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from app.services.sms_service import send_sms
from app.utils.phone import is_valid_iranian_mobile, normalize_mobile
from app.utils.security import create_access_token


def _hash_code(mobile: str, code: str) -> str:
    raw = f"{mobile}:{code}:{settings.SECRET_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _generate_code() -> str:
    length = settings.OTP_LENGTH
    upper = 10**length
    return str(secrets.randbelow(upper)).zfill(length)


async def send_login_otp(db: AsyncSession, body: SendOtpRequest) -> dict:
    mobile = normalize_mobile(body.phone)
    if not is_valid_iranian_mobile(mobile):
        raise BadRequestError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")

    user_result = await db.execute(
        select(User).where(User.mobile == mobile, User.is_active.is_(True))
    )
    if not user_result.scalar_one_or_none():
        raise NotFoundError("کاربری با این شماره موبایل یافت نشد")

    cooldown = timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)
    latest = await db.execute(
        select(LoginOtp)
        .where(LoginOtp.mobile == mobile)
        .order_by(LoginOtp.created_at.desc())
        .limit(1)
    )
    existing = latest.scalar_one_or_none()
    if existing:
        elapsed = datetime.utcnow() - existing.created_at
        if elapsed < cooldown:
            remaining = int((cooldown - elapsed).total_seconds())
            raise BadRequestError(f"لطفاً {remaining} ثانیه دیگر برای ارسال مجدد صبر کنید")

    await db.execute(delete(LoginOtp).where(LoginOtp.mobile == mobile))

    code = _generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    db.add(
        LoginOtp(
            mobile=mobile,
            code_hash=_hash_code(mobile, code),
            expires_at=expires_at,
            attempt_count=0,
        )
    )
    await db.commit()

    message = settings.SMS_OTP_TEMPLATE.format(
        code=code,
        minutes=settings.OTP_EXPIRE_MINUTES,
    )
    await send_sms(mobile, message)

    result = {
        "message": "کد تأیید به شماره موبایل شما ارسال شد",
        "expires_in": settings.OTP_EXPIRE_MINUTES * 60,
        "resend_after": settings.OTP_RESEND_COOLDOWN_SECONDS,
    }
    if settings.SMS_PROVIDER == "console" and settings.SMS_DEBUG_RETURN_CODE:
        result["debug_code"] = code
    return result


async def verify_login_otp(db: AsyncSession, body: VerifyOtpRequest) -> dict:
    mobile = normalize_mobile(body.phone)
    if not is_valid_iranian_mobile(mobile):
        raise BadRequestError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")

    code = body.code.strip()
    if not code.isdigit() or len(code) != settings.OTP_LENGTH:
        raise BadRequestError(f"کد تأیید باید {settings.OTP_LENGTH} رقم باشد")

    otp_result = await db.execute(
        select(LoginOtp)
        .where(LoginOtp.mobile == mobile)
        .order_by(LoginOtp.created_at.desc())
        .limit(1)
    )
    otp = otp_result.scalar_one_or_none()
    if not otp:
        raise UnauthorizedError("کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید")

    if datetime.utcnow() > otp.expires_at:
        await db.delete(otp)
        await db.commit()
        raise UnauthorizedError("کد تأیید منقضی شده است. لطفاً دوباره درخواست دهید")

    if otp.attempt_count >= settings.OTP_MAX_ATTEMPTS:
        await db.delete(otp)
        await db.commit()
        raise UnauthorizedError("تعداد تلاش‌های مجاز تمام شد. لطفاً کد جدید درخواست دهید")

    if _hash_code(mobile, code) != otp.code_hash:
        otp.attempt_count += 1
        await db.commit()
        raise UnauthorizedError("کد تأیید اشتباه است")

    user_result = await db.execute(
        select(User).where(User.mobile == mobile, User.is_active.is_(True))
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise NotFoundError("کاربر یافت نشد")

    await db.delete(otp)
    await db.commit()

    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {
        "access_token": token,
        "user": user_to_dict(user),
    }
