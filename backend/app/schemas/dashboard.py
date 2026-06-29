from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.schemas.activity import ActivityResponse


class DashboardKpis(BaseModel):
    weighted_pipeline_value: Decimal
    conversion_rate: float
    at_risk_count: int
    overdue_followups: int
    period: str


class FunnelStage(BaseModel):
    stage: str
    count: int
    total_value: Decimal


class FunnelResponse(BaseModel):
    stages: list[FunnelStage]


class TeamMemberPerformance(BaseModel):
    user_id: str
    user_name: str
    open_count: int
    pipeline_value: Decimal
    win_rate: float
    last_activity_date: Optional[datetime] = None


class TeamPerformanceResponse(BaseModel):
    members: list[TeamMemberPerformance]


class MonthlyTrendPoint(BaseModel):
    month: str
    won_count: int
    won_value: Decimal


class LossReasonPoint(BaseModel):
    reason: str
    count: int


class TrendsResponse(BaseModel):
    monthly_won: list[MonthlyTrendPoint]
    loss_reasons: list[LossReasonPoint]


class ExpertOpenOpportunity(BaseModel):
    id: str
    title: str
    account_name: Optional[str] = None
    sales_stage: str
    estimated_value: Optional[Decimal] = None
    expected_close_date: Optional[datetime] = None
    is_overdue: bool = False


class ExpertSummaryResponse(BaseModel):
    weighted_pipeline_value: Decimal
    open_opportunities_count: int
    conversion_rate: float
    overdue_followups: int
    open_opportunities: list[ExpertOpenOpportunity]
    overdue_activities: list[ActivityResponse]
    upcoming_activities: list[ActivityResponse]
