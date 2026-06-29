from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.account import Industry, PriorityLevel, RelationshipStatus
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountListResponse,
    AccountResponse,
    AccountUpdate,
)
from app.services import account_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    search: str | None = Query(None),
    industry: Industry | None = Query(None),
    priority_level: PriorityLevel | None = Query(None),
    relationship_status: RelationshipStatus | None = Query(None),
    account_manager_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await account_service.list_accounts(
        db,
        current_user,
        search=search,
        industry=industry,
        priority_level=priority_level,
        relationship_status=relationship_status,
        account_manager_id=account_manager_id,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(
    body: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await account_service.create_account(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await account_service.get_account(db, current_user, account_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    body: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await account_service.update_account(db, current_user, account_id, body)
    except ServiceError as e:
        raise_http(e)


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        await account_service.delete_account(db, current_user, account_id)
    except ServiceError as e:
        raise_http(e)


@router.get("/{account_id}/audit-logs")
async def get_account_audit_logs(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await account_service.get_audit_logs(db, account_id)
    except ServiceError as e:
        raise_http(e)
