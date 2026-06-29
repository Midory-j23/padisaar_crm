import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Industry(str, enum.Enum):
    OIL_GAS = "OIL_GAS"
    PETROCHEMICAL = "PETROCHEMICAL"
    STEEL = "STEEL"
    MINING = "MINING"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    OTHER = "OTHER"


class OrgSize(str, enum.Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


class PriorityLevel(str, enum.Enum):
    A_STRATEGIC = "A_STRATEGIC"
    B_MEDIUM = "B_MEDIUM"
    C_GENERAL = "C_GENERAL"


class RelationshipStatus(str, enum.Enum):
    CURRENT_CLIENT = "CURRENT_CLIENT"
    FORMER_CLIENT = "FORMER_CLIENT"
    NEW_LEAD = "NEW_LEAD"
    COMPETITOR = "COMPETITOR"


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    national_id: Mapped[str | None] = mapped_column(String, nullable=True)
    industry: Mapped[Industry | None] = mapped_column(SAEnum(Industry), nullable=True)
    size: Mapped[OrgSize | None] = mapped_column(SAEnum(OrgSize), nullable=True)
    priority_level: Mapped[PriorityLevel | None] = mapped_column(SAEnum(PriorityLevel), nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    relationship_status: Mapped[RelationshipStatus | None] = mapped_column(
        SAEnum(RelationshipStatus), nullable=True
    )
    account_manager_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account_manager = relationship("User", foreign_keys=[account_manager_id])
    contacts = relationship("Contact", back_populates="account", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="account", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="account", cascade="all, delete-orphan")
