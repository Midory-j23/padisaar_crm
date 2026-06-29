import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import ARRAY, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectType(str, enum.Enum):
    EPC = "EPC"
    EQUIPMENT_SUPPLY = "EQUIPMENT_SUPPLY"
    CONSULTING = "CONSULTING"
    SUPPORT = "SUPPORT"


class SalesStage(str, enum.Enum):
    INITIAL_CONTACT = "INITIAL_CONTACT"
    NEEDS_ASSESSMENT = "NEEDS_ASSESSMENT"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    NEGOTIATION = "NEGOTIATION"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    CLOSED_WON = "CLOSED_WON"
    CLOSED_LOST = "CLOSED_LOST"
    ABANDONED = "ABANDONED"


class LeadSource(str, enum.Enum):
    TENDER = "TENDER"
    COLD_CALL = "COLD_CALL"
    REFERRAL = "REFERRAL"
    CONFERENCE = "CONFERENCE"
    WEBSITE = "WEBSITE"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    project_type: Mapped[ProjectType | None] = mapped_column(SAEnum(ProjectType), nullable=True)
    sales_stage: Mapped[SalesStage] = mapped_column(
        SAEnum(SalesStage), default=SalesStage.INITIAL_CONTACT
    )
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    probability: Mapped[int] = mapped_column(Integer, default=10)
    lead_source: Mapped[LeadSource | None] = mapped_column(SAEnum(LeadSource), nullable=True)
    expected_close_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    competitors: Mapped[list] = mapped_column(ARRAY(String), default=list)
    assigned_to_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account = relationship("Account", back_populates="opportunities")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    activities = relationship("Activity", back_populates="opportunity")
    win_loss = relationship("WinLossAnalysis", back_populates="opportunity", uselist=False)
    stage_history = relationship(
        "OpportunityStageHistory", back_populates="opportunity", cascade="all, delete-orphan"
    )


class OpportunityStageHistory(Base):
    __tablename__ = "opportunity_stage_history"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), nullable=False)
    from_stage: Mapped[SalesStage | None] = mapped_column(SAEnum(SalesStage), nullable=True)
    to_stage: Mapped[SalesStage] = mapped_column(SAEnum(SalesStage), nullable=False)
    changed_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    opportunity = relationship("Opportunity", back_populates="stage_history")
    changed_by = relationship("User")
