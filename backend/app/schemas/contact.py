import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.models.contact import InfluenceLevel, Sentiment


def normalize_mobile(v: str) -> str:
    persian = "۰۱۲۳۴۵۶۷۸۹"
    for i, p in enumerate(persian):
        v = v.replace(p, str(i))
    return v


class ContactCreate(BaseModel):
    account_id: str
    full_name: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    mobile: Optional[str] = None
    direct_line: Optional[str] = None
    email: Optional[EmailStr] = None
    influence_level: Optional[InfluenceLevel] = None
    sentiment: Optional[Sentiment] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is None or str(v).strip() == "":
            return None
        v = normalize_mobile(str(v).strip())
        if not re.match(r"^09\d{9}$", v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return v


class ContactUpdate(BaseModel):
    account_id: Optional[str] = None
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    mobile: Optional[str] = None
    direct_line: Optional[str] = None
    email: Optional[EmailStr] = None
    influence_level: Optional[InfluenceLevel] = None
    sentiment: Optional[Sentiment] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        if v is None or str(v).strip() == "":
            return None
        v = normalize_mobile(str(v).strip())
        if not re.match(r"^09\d{9}$", v):
            raise ValueError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
        return v


class ContactResponse(BaseModel):
    id: str
    account_id: str
    account_name: Optional[str] = None
    full_name: str
    job_title: Optional[str] = None
    department: Optional[str] = None
    mobile: Optional[str] = None
    direct_line: Optional[str] = None
    email: Optional[str] = None
    influence_level: Optional[InfluenceLevel] = None
    sentiment: Optional[Sentiment] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    per_page: int
