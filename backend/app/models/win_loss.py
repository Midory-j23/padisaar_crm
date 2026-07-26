import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FinalStatus(str, enum.Enum):
    WON = "WON"
    LOST = "LOST"
    ABANDONED = "ABANDONED"


class ResultReason(str, enum.Enum):
    PRICE = "PRICE"
    TECHNOLOGY = "TECHNOLOGY"
    RELATIONSHIPS = "RELATIONSHIPS"
    TIMING = "TIMING"
    NO_GO = "NO_GO"
    OTHER = "OTHER"


class WinLossAnalysis(Base):
    __tablename__ = "win_loss_analysis"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(
        ForeignKey("opportunities.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    final_status: Mapped[FinalStatus] = mapped_column(SAEnum(FinalStatus), nullable=False)
    result_reason: Mapped[ResultReason | None] = mapped_column(SAEnum(ResultReason), nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_contract_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 2), nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    analyzed_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)

    opportunity = relationship("Opportunity", back_populates="win_loss")
    analyzed_by = relationship("User")
