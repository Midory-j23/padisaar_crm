from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.models.opportunity import LeadSource, ProjectType, SalesStage
from app.utils.datetime_utils import to_naive_utc

STAGE_PROBABILITY = {
    SalesStage.INITIAL_CONTACT: 10,
    SalesStage.NEEDS_ASSESSMENT: 25,
    SalesStage.PROPOSAL_SENT: 40,
    SalesStage.NEGOTIATION: 65,
    SalesStage.CONTRACT_SIGNED: 90,
    SalesStage.CLOSED_WON: 100,
    SalesStage.CLOSED_LOST: 0,
    SalesStage.ABANDONED: 0,
}

CLOSED_STAGES = {SalesStage.CLOSED_WON, SalesStage.CLOSED_LOST, SalesStage.ABANDONED}

KANBAN_STAGES = [
    SalesStage.INITIAL_CONTACT,
    SalesStage.NEEDS_ASSESSMENT,
    SalesStage.PROPOSAL_SENT,
    SalesStage.NEGOTIATION,
    SalesStage.CONTRACT_SIGNED,
    SalesStage.CLOSED_WON,
    SalesStage.CLOSED_LOST,
]


class OpportunityCreate(BaseModel):
    account_id: str
    title: str
    project_type: Optional[ProjectType] = None
    sales_stage: SalesStage = SalesStage.INITIAL_CONTACT
    estimated_value: Optional[Decimal] = None
    probability: Optional[int] = None
    lead_source: Optional[LeadSource] = None
    expected_close_date: Optional[datetime] = None
    competitors: List[str] = []
    assigned_to_id: Optional[str] = None

    @field_validator("expected_close_date")
    @classmethod
    def normalize_expected_close(cls, v: datetime | None) -> datetime | None:
        return to_naive_utc(v)

    @field_validator("probability", mode="before")
    @classmethod
    def set_probability(cls, v, info):
        if v is None:
            stage = info.data.get("sales_stage", SalesStage.INITIAL_CONTACT)
            return STAGE_PROBABILITY.get(stage, 10)
        return max(0, min(100, int(v)))


class OpportunityUpdate(BaseModel):
    account_id: Optional[str] = None
    title: Optional[str] = None
    project_type: Optional[ProjectType] = None
    sales_stage: Optional[SalesStage] = None
    estimated_value: Optional[Decimal] = None
    probability: Optional[int] = None
    lead_source: Optional[LeadSource] = None
    expected_close_date: Optional[datetime] = None
    competitors: Optional[List[str]] = None
    assigned_to_id: Optional[str] = None

    @field_validator("expected_close_date")
    @classmethod
    def normalize_expected_close(cls, v: datetime | None) -> datetime | None:
        return to_naive_utc(v)

    @field_validator("probability")
    @classmethod
    def clamp_probability(cls, v: int | None) -> int | None:
        if v is None:
            return v
        return max(0, min(100, v))


class OpportunityResponse(BaseModel):
    id: str
    account_id: str
    account_name: Optional[str] = None
    title: str
    project_type: Optional[ProjectType] = None
    sales_stage: SalesStage
    estimated_value: Optional[Decimal] = None
    probability: int
    lead_source: Optional[LeadSource] = None
    expected_close_date: Optional[datetime] = None
    competitors: List[str] = []
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    is_overdue: bool = False
    has_win_loss: bool = False
    pending_win_loss: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class OpportunityListResponse(BaseModel):
    items: list[OpportunityResponse]
    total: int
    page: int
    per_page: int


class StageHistoryResponse(BaseModel):
    id: str
    from_stage: Optional[SalesStage] = None
    to_stage: SalesStage
    changed_by_name: Optional[str] = None
    changed_at: datetime


class OpportunityDetailResponse(OpportunityResponse):
    stage_history: list[StageHistoryResponse] = []


class OpportunitySummary(BaseModel):
    total_open: int
    total_pipeline_value: Decimal
    weighted_pipeline_value: Decimal
    total_won: int
    total_lost: int
