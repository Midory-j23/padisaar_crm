from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ErrorReportCreate(BaseModel):
    source: Literal["frontend", "backend"] = "frontend"
    message: str = Field(..., min_length=1, max_length=2000)
    stack: Optional[str] = Field(default=None, max_length=8000)
    path: Optional[str] = Field(default=None, max_length=500)
    method: Optional[str] = Field(default=None, max_length=16)
    status_code: Optional[int] = None
    user_agent: Optional[str] = Field(default=None, max_length=500)
    app_version: Optional[str] = Field(default=None, max_length=32)
    extra: dict = Field(default_factory=dict)


class ErrorReportResponse(BaseModel):
    id: str
    fingerprint: str
    source: str
    status: str
    message: str
    stack: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_agent: Optional[str] = None
    app_version: Optional[str] = None
    occurrence_count: int
    extra: dict = Field(default_factory=dict)
    created_at: datetime
    last_seen_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ErrorReportListResponse(BaseModel):
    items: list[ErrorReportResponse]
    total: int
    page: int
    per_page: int


class OpenCountResponse(BaseModel):
    count: int
