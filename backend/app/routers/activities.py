from datetime import datetime

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.activity import ActivityType
from app.models.user import User
from app.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    ActivityUpdate,
    OverdueActivitiesResponse,
    OverdueCountResponse,
)
from app.services import activity_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.get("/overdue", response_model=OverdueActivitiesResponse)
async def list_overdue_activities(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.list_overdue(db, current_user, limit=limit)


@router.get("/overdue/count", response_model=OverdueCountResponse)
async def overdue_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.overdue_count(db, current_user)


@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        return await activity_service.upload_attachment(file)
    except ServiceError as e:
        raise_http(e)


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    account_id: str | None = Query(None),
    opportunity_id: str | None = Query(None),
    contact_id: str | None = Query(None),
    activity_type: ActivityType | None = Query(None),
    assigned_to: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.list_activities(
        db,
        current_user,
        account_id=account_id,
        opportunity_id=opportunity_id,
        contact_id=contact_id,
        activity_type=activity_type,
        assigned_to=assigned_to,
        from_date=from_date,
        to_date=to_date,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=ActivityResponse, status_code=201)
async def create_activity(
    body: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await activity_service.create_activity(db, current_user, body)
    except ServiceError as e:
        raise_http(e)


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await activity_service.get_activity(db, current_user, activity_id)
    except ServiceError as e:
        raise_http(e)


@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: str,
    body: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await activity_service.update_activity(db, current_user, activity_id, body)
    except ServiceError as e:
        raise_http(e)


@router.put("/{activity_id}/complete-followup", response_model=ActivityResponse)
async def complete_followup(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await activity_service.complete_followup(db, current_user, activity_id)
    except ServiceError as e:
        raise_http(e)


@router.delete("/{activity_id}", status_code=204)
async def delete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        await activity_service.delete_activity(db, current_user, activity_id)
    except ServiceError as e:
        raise_http(e)
