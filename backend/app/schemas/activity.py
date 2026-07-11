from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.activity import ActivityType
from app.utils.datetime_utils import to_naive_utc


class ActivityCreate(BaseModel):
    account_id: str
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None
    contact_ids: list[str] = []
    activity_type: ActivityType
    activity_date: datetime
    meeting_notes: Optional[str] = None
    outcome: Optional[str] = None
    next_step: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    attachment_url: Optional[str] = None

    @field_validator("activity_date", "follow_up_date")
    @classmethod
    def normalize_datetimes(cls, v: datetime | None) -> datetime | None:
        return to_naive_utc(v)


class ActivityUpdate(BaseModel):
    account_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None
    contact_ids: Optional[list[str]] = None
    activity_type: Optional[ActivityType] = None
    activity_date: Optional[datetime] = None
    meeting_notes: Optional[str] = None
    outcome: Optional[str] = None
    next_step: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    attachment_url: Optional[str] = None

    @field_validator("activity_date", "follow_up_date")
    @classmethod
    def normalize_datetimes(cls, v: datetime | None) -> datetime | None:
        return to_naive_utc(v)


class ActivityResponse(BaseModel):
    id: str
    account_id: str
    account_name: Optional[str] = None
    opportunity_id: Optional[str] = None
    opportunity_title: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    contact_ids: list[str] = []
    contact_names: list[str] = []
    activity_type: ActivityType
    activity_date: datetime
    meeting_notes: Optional[str] = None
    outcome: Optional[str] = None
    next_step: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    follow_up_completed: bool
    attachment_url: Optional[str] = None
    created_by_id: str
    created_by_name: Optional[str] = None
    is_follow_up_overdue: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    per_page: int


class OverdueCountResponse(BaseModel):
    count: int


class OverdueActivitiesResponse(BaseModel):
    count: int
    items: list[ActivityResponse]
