from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_optional_user, require_manager
from app.models.user import User
from app.schemas.error_report import (
    ErrorReportCreate,
    ErrorReportListResponse,
    ErrorReportResponse,
    OpenCountResponse,
)
from app.services import error_report_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


@router.post("", response_model=ErrorReportResponse, status_code=201)
async def create_error_report(
    body: ErrorReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    row = await error_report_service.record_error(
        db, body, user_id=current_user.id if current_user else None
    )
    await db.commit()
    saved = await error_report_service.get_error(db, row.id)
    return error_report_service.to_response(saved)


@router.get("/open-count", response_model=OpenCountResponse)
async def get_open_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return {"count": await error_report_service.open_count(db)}


@router.get("", response_model=ErrorReportListResponse)
async def list_error_reports(
    status: str | None = Query(None),
    source: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await error_report_service.list_errors(
        db, status=status, source=source, page=page, per_page=per_page
    )


@router.put("/{error_id}/resolve", response_model=ErrorReportResponse)
async def resolve_error_report(
    error_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await error_report_service.resolve_error(db, error_id, current_user)
    except ServiceError as e:
        raise_http(e)
