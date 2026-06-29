from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.contact import InfluenceLevel, Sentiment
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactListResponse,
    ContactResponse,
    ContactUpdate,
)
from app.services import contact_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    search: str | None = Query(None),
    account_id: str | None = Query(None),
    influence_level: InfluenceLevel | None = Query(None),
    sentiment: Sentiment | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await contact_service.list_contacts(
        db,
        current_user,
        search=search,
        account_id=account_id,
        influence_level=influence_level,
        sentiment=sentiment,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(
    body: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await contact_service.create_contact(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await contact_service.get_contact(db, current_user, contact_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await contact_service.update_contact(db, current_user, contact_id, body)
    except ServiceError as e:
        raise_http(e)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        await contact_service.delete_contact(db, current_user, contact_id)
    except ServiceError as e:
        raise_http(e)
