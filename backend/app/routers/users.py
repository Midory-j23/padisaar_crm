from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_manager
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate, AdminResetPasswordRequest
from app.services import user_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await user_service.list_users(db)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await user_service.create_user(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await user_service.update_user(db, current_user, user_id, body)
    except ServiceError as e:
        raise_http(e)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        await user_service.delete_user(db, current_user, user_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{user_id}/password")
async def reset_user_password(
    user_id: str,
    body: AdminResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await user_service.reset_user_password(
            db, current_user, user_id, body.new_password
        )
    except ServiceError as e:
        raise_http(e)
