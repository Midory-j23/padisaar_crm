from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.opportunity import SalesStage
from app.models.user import User
from app.schemas.opportunity import (
    OpportunityCreate,
    OpportunityDetailResponse,
    OpportunityListResponse,
    OpportunityResponse,
    OpportunitySummary,
    OpportunityUpdate,
)
from app.services import opportunity_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("/summary", response_model=OpportunitySummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.get_summary(db, current_user)


@router.get("/kanban")
async def get_kanban(
    account_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.get_kanban(db, current_user, account_id)


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    stage: SalesStage | None = Query(None),
    account_id: str | None = Query(None),
    assigned_to_id: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.list_opportunities(
        db,
        current_user,
        stage=stage,
        account_id=account_id,
        assigned_to_id=assigned_to_id,
        search=search,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=OpportunityResponse, status_code=201)
async def create_opportunity(
    body: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await opportunity_service.create_opportunity(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/{opportunity_id}", response_model=OpportunityDetailResponse)
async def get_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await opportunity_service.get_opportunity_detail(db, current_user, opportunity_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: str,
    body: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await opportunity_service.update_opportunity(db, current_user, opportunity_id, body)
    except ServiceError as e:
        raise_http(e)


@router.delete("/{opportunity_id}", status_code=204)
async def delete_opportunity(
    opportunity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        await opportunity_service.delete_opportunity(db, current_user, opportunity_id)
    except ServiceError as e:
        raise_http(e)
