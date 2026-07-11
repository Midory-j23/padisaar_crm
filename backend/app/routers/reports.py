from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.activity import ActivityType
from app.models.audit_log import AuditAction
from app.models.opportunity import SalesStage
from app.models.user import User
from app.schemas.reports import (
    AuditLogListResponse,
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportPreviewResponse,
)
from app.services import reports_service
from app.services.exceptions import ServiceError
from app.services.http import raise_http

router = APIRouter()


def _excel_response(buffer, filename: str) -> StreamingResponse:
    encoded = quote(filename)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
    )


def _pdf_response(buffer, filename: str) -> StreamingResponse:
    encoded = quote(filename)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
    )


@router.get("/opportunities")
async def report_opportunities(
    stage: SalesStage | None = Query(None),
    account_id: str | None = Query(None),
    assigned_to_id: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await reports_service.report_opportunities(
        db,
        current_user,
        stage=stage,
        account_id=account_id,
        assigned_to_id=assigned_to_id,
        search=search,
    )


@router.get("/activities")
async def report_activities(
    account_id: str | None = Query(None),
    opportunity_id: str | None = Query(None),
    activity_type: ActivityType | None = Query(None),
    assigned_to: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await reports_service.report_activities(
        db,
        current_user,
        account_id=account_id,
        opportunity_id=opportunity_id,
        activity_type=activity_type,
        assigned_to=assigned_to,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/export/accounts")
async def export_accounts(
    template: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_accounts(db, template=template)
    name = "accounts_template.xlsx" if template else "accounts.xlsx"
    return _excel_response(buffer, name)


@router.get("/export/contacts")
async def export_contacts(
    template: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_contacts(db, template=template)
    name = "contacts_template.xlsx" if template else "contacts.xlsx"
    return _excel_response(buffer, name)


@router.get("/export/opportunities")
async def export_opportunities(
    template: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_opportunities(db, template=template)
    name = "opportunities_template.xlsx" if template else "opportunities.xlsx"
    return _excel_response(buffer, name)


@router.get("/export/activities")
async def export_activities(
    template: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_activities(db, template=template)
    name = "activities_template.xlsx" if template else "activities.xlsx"
    return _excel_response(buffer, name)


@router.post("/import/accounts/preview", response_model=ImportPreviewResponse)
async def preview_import_accounts(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        content = await file.read()
        return await reports_service.preview_import_accounts(db, content)
    except ServiceError as e:
        raise_http(e)


@router.post("/import/accounts/confirm", response_model=ImportConfirmResponse)
async def confirm_import_accounts(
    body: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await reports_service.confirm_import_accounts(db, current_user, body.records)
    except ServiceError as e:
        raise_http(e)


@router.post("/import/contacts/preview", response_model=ImportPreviewResponse)
async def preview_import_contacts(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        content = await file.read()
        return await reports_service.preview_import_contacts(db, content)
    except ServiceError as e:
        raise_http(e)


@router.post("/import/contacts/confirm", response_model=ImportConfirmResponse)
async def confirm_import_contacts(
    body: ImportConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    try:
        return await reports_service.confirm_import_contacts(db, current_user, body.records)
    except ServiceError as e:
        raise_http(e)


@router.get("/export/pdf/opportunities")
async def export_opportunities_pdf(
    stage: SalesStage | None = Query(None),
    account_id: str | None = Query(None),
    assigned_to_id: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_opportunities_pdf(
        db,
        current_user,
        stage=stage,
        account_id=account_id,
        assigned_to_id=assigned_to_id,
        search=search,
    )
    return _pdf_response(buffer, "opportunities_report.pdf")


@router.get("/export/pdf/activities")
async def export_activities_pdf(
    account_id: str | None = Query(None),
    opportunity_id: str | None = Query(None),
    activity_type: ActivityType | None = Query(None),
    assigned_to: str | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    buffer = await reports_service.export_activities_pdf(
        db,
        current_user,
        account_id=account_id,
        opportunity_id=opportunity_id,
        activity_type=activity_type,
        assigned_to=assigned_to,
        from_date=from_date,
        to_date=to_date,
    )
    return _pdf_response(buffer, "activities_report.pdf")


@router.get("/audit-log", response_model=AuditLogListResponse)
async def get_audit_log(
    entity_type: str | None = Query(None),
    user_id: str | None = Query(None),
    action: AuditAction | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return await reports_service.list_audit_logs(
        db,
        entity_type=entity_type,
        user_id=user_id,
        action=action,
        from_date=from_date,
        to_date=to_date,
        page=page,
        per_page=per_page,
    )
