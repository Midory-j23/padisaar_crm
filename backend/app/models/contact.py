import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InfluenceLevel(str, enum.Enum):
    DECISION_MAKER = "DECISION_MAKER"
    TECHNICAL_INFLUENCER = "TECHNICAL_INFLUENCER"
    BLOCKER = "BLOCKER"
    BUYER = "BUYER"


class Sentiment(str, enum.Enum):
    CHAMPION = "CHAMPION"
    NEUTRAL = "NEUTRAL"
    OPPONENT = "OPPONENT"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    job_title: Mapped[str | None] = mapped_column(String, nullable=True)
    department: Mapped[str | None] = mapped_column(String, nullable=True)
    mobile: Mapped[str | None] = mapped_column(String, nullable=True)
    direct_line: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    influence_level: Mapped[InfluenceLevel | None] = mapped_column(SAEnum(InfluenceLevel), nullable=True)
    sentiment: Mapped[Sentiment | None] = mapped_column(SAEnum(Sentiment), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account = relationship("Account", back_populates="contacts")
