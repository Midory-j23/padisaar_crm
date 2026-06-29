from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_serializer

from app.models.audit_log import AuditAction
from app.utils.datetime_utils import as_utc_aware


class ImportRowPreview(BaseModel):
    row_number: int
    record: dict[str, Any]
    errors: list[str]
    valid: bool


class ImportPreviewResponse(BaseModel):
    rows: list[ImportRowPreview]
    valid_count: int
    error_count: int


class ImportConfirmRequest(BaseModel):
    records: list[dict[str, Any]]


class ImportConfirmResponse(BaseModel):
    created_count: int
    message: str


class AuditLogEntryResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    entity_summary: Optional[str] = None
    action: AuditAction
    changed_by_id: str
    changed_by_name: Optional[str] = None
    change_data: dict
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> datetime:
        return as_utc_aware(value)  # type: ignore[return-value]


class AuditLogListResponse(BaseModel):
    items: list[AuditLogEntryResponse]
    total: int
    page: int
    per_page: int
