from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.account import Industry
from app.models.opportunity import ProjectType
from app.models.user import User
from app.models.win_loss import FinalStatus, ResultReason
from app.schemas.win_loss import (
    LessonsResponse,
    WinLossCreate,
    WinLossListResponse,
    WinLossResponse,
    WinLossSummary,
    WinLossUpdate,
)
from app.services import win_loss_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("/summary", response_model=WinLossSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await win_loss_service.get_summary(db, current_user)


@router.get("/lessons", response_model=LessonsResponse)
async def get_lessons(
    search: str | None = Query(None),
    industry: Industry | None = Query(None),
    project_type: ProjectType | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await win_loss_service.get_lessons(
        db,
        current_user,
        search=search,
        industry=industry,
        project_type=project_type,
        page=page,
        per_page=per_page,
    )


@router.get("", response_model=WinLossListResponse)
async def list_win_loss(
    status: FinalStatus | None = Query(None),
    reason: ResultReason | None = Query(None),
    opportunity_id: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    assigned_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await win_loss_service.list_win_loss(
        db,
        current_user,
        status=status,
        reason=reason,
        opportunity_id=opportunity_id,
        from_date=from_date,
        to_date=to_date,
        assigned_to=assigned_to,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=WinLossResponse, status_code=201)
async def create_win_loss(
    body: WinLossCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await win_loss_service.create_win_loss(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/{analysis_id}", response_model=WinLossResponse)
async def get_win_loss(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await win_loss_service.get_win_loss(db, current_user, analysis_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{analysis_id}", response_model=WinLossResponse)
async def update_win_loss(
    analysis_id: str,
    body: WinLossUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await win_loss_service.update_win_loss(db, current_user, analysis_id, body)
    except ServiceError as e:
        raise_http(e)
