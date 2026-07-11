from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole
from app.utils.phone import is_valid_iranian_mobile, normalize_mobile


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SendOtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not is_valid_iranian_mobile(v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return normalize_mobile(v)


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not is_valid_iranian_mobile(v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return normalize_mobile(v)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    mobile: str | None = None
    role: str
    is_active: bool = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    mobile: str | None = None
    password: str
    role: UserRole = UserRole.EXPERT

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("رمز عبور باید حداقل ۶ کاراکتر باشد")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not is_valid_iranian_mobile(v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return normalize_mobile(v)


class UserUpdate(BaseModel):
    name: str | None = None
    mobile: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not is_valid_iranian_mobile(v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return normalize_mobile(v)


class NotificationPrefsUpdate(BaseModel):
    OVERDUE_FOLLOWUP: bool | None = None
    UPCOMING_FOLLOWUP: bool | None = None
    AT_RISK_OPPORTUNITY: bool | None = None
    PENDING_WIN_LOSS: bool | None = None
    STAGE_CHANGE: bool | None = None
    NEW_ASSIGNMENT: bool | None = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("رمز عبور باید حداقل ۶ کاراکتر باشد")
        return v
