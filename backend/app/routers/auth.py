from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    NotificationPrefsUpdate,
    LoginResponse,
    SendOtpRequest,
    VerifyOtpRequest,
)
from app.services import auth_service, otp_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await auth_service.login(db, body)
    except ServiceError as e:
        raise_http(e)


@router.post("/otp/send")
async def send_otp(body: SendOtpRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await otp_service.send_login_otp(db, body)
    except ServiceError as e:
        raise_http(e)


@router.post("/otp/verify", response_model=LoginResponse)
async def verify_otp(body: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await otp_service.verify_login_otp(db, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return auth_service.user_to_dict(current_user)


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await auth_service.change_password(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/notification-prefs")
async def get_notification_prefs(current_user: User = Depends(get_current_user)):
    return await auth_service.get_notification_prefs(current_user)


@router.put("/notification-prefs")
async def update_notification_prefs(
    body: NotificationPrefsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.update_notification_prefs(db, current_user, body)


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await auth_service.list_active_users(db)
