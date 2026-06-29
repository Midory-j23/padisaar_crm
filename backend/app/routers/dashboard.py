from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.dashboard import (
    DashboardKpis,
    ExpertSummaryResponse,
    FunnelResponse,
    TeamPerformanceResponse,
    TrendsResponse,
)
from app.services import dashboard_service

router = APIRouter()


@router.get("/kpis", response_model=DashboardKpis)
async def get_kpis(
    period: str = Query("month"),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await dashboard_service.get_kpis(
        db, current_user, period=period, from_date=from_date, to_date=to_date
    )


@router.get("/funnel", response_model=FunnelResponse)
async def get_funnel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await dashboard_service.get_funnel(db, current_user)


@router.get("/team-performance", response_model=TeamPerformanceResponse)
async def get_team_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await dashboard_service.get_team_performance(db)


@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await dashboard_service.get_trends(db, current_user)


@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await dashboard_service.get_recent_activities(db, current_user, limit)


@router.get("/expert-summary", response_model=ExpertSummaryResponse)
async def get_expert_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await dashboard_service.get_expert_summary(db, current_user)
