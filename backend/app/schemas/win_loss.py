from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.win_loss import FinalStatus, ResultReason


class WinLossCreate(BaseModel):
    opportunity_id: str
    final_status: FinalStatus
    result_reason: Optional[ResultReason] = None
    lessons_learned: Optional[str] = None
    final_contract_value: Optional[Decimal] = None


class WinLossUpdate(BaseModel):
    result_reason: Optional[ResultReason] = None
    lessons_learned: Optional[str] = None
    final_contract_value: Optional[Decimal] = None


class WinLossResponse(BaseModel):
    id: str
    opportunity_id: str
    opportunity_title: Optional[str] = None
    account_name: Optional[str] = None
    final_status: FinalStatus
    result_reason: Optional[ResultReason] = None
    lessons_learned: Optional[str] = None
    final_contract_value: Optional[Decimal] = None
    analyzed_at: datetime
    analyzed_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class WinLossListResponse(BaseModel):
    items: list[WinLossResponse]
    total: int
    page: int
    per_page: int


class WinLossSummary(BaseModel):
    total_closed: int
    total_won: int
    total_lost: int
    win_rate: float
    avg_cycle_days: Optional[float]
    total_won_value: Optional[Decimal]
    top_loss_reason: Optional[str]


class LessonCard(BaseModel):
    id: str
    opportunity_title: Optional[str] = None
    account_name: Optional[str] = None
    final_status: FinalStatus
    lessons_learned: str
    analyzed_at: datetime
    analyzed_by_name: Optional[str] = None


class LessonsResponse(BaseModel):
    items: list[LessonCard]
    total: int
