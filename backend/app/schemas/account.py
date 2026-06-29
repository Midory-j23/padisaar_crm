from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

from app.models.account import Industry, OrgSize, PriorityLevel, RelationshipStatus


class AccountCreate(BaseModel):
    name: str
    national_id: Optional[str] = None
    industry: Optional[Industry] = None
    size: Optional[OrgSize] = None
    priority_level: Optional[PriorityLevel] = None
    location: Optional[str] = None
    website: Optional[str] = None
    relationship_status: Optional[RelationshipStatus] = None
    account_manager_id: Optional[str] = None

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, v: str | None) -> str | None:
        if v and (not v.isdigit() or len(v) != 11):
            raise ValueError("شناسه ملی باید ۱۱ رقم باشد")
        return v


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    national_id: Optional[str] = None
    industry: Optional[Industry] = None
    size: Optional[OrgSize] = None
    priority_level: Optional[PriorityLevel] = None
    location: Optional[str] = None
    website: Optional[str] = None
    relationship_status: Optional[RelationshipStatus] = None
    account_manager_id: Optional[str] = None

    @field_validator("national_id")
    @classmethod
    def validate_national_id(cls, v: str | None) -> str | None:
        if v and (not v.isdigit() or len(v) != 11):
            raise ValueError("شناسه ملی باید ۱۱ رقم باشد")
        return v


class AccountResponse(BaseModel):
    id: str
    name: str
    national_id: Optional[str] = None
    industry: Optional[Industry] = None
    size: Optional[OrgSize] = None
    priority_level: Optional[PriorityLevel] = None
    location: Optional[str] = None
    website: Optional[str] = None
    relationship_status: Optional[RelationshipStatus] = None
    account_manager_id: Optional[str] = None
    account_manager_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AccountListResponse(BaseModel):
    items: list[AccountResponse]
    total: int
    page: int
    per_page: int
