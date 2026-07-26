import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

activity_contacts = Table(
    "activity_contacts",
    Base.metadata,
    Column("activity_id", String, ForeignKey("activities.id", ondelete="CASCADE"), primary_key=True),
    Column("contact_id", String, ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
)


class ActivityType(str, enum.Enum):
    IN_PERSON_MEETING = "IN_PERSON_MEETING"
    PHONE_CALL = "PHONE_CALL"
    SITE_VISIT = "SITE_VISIT"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    EMAIL = "EMAIL"


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    opportunity_id: Mapped[str | None] = mapped_column(
        ForeignKey("opportunities.id", ondelete="SET NULL"), nullable=True
    )
    contact_id: Mapped[str | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True
    )
    activity_type: Mapped[ActivityType] = mapped_column(SAEnum(ActivityType), nullable=False)
    activity_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    meeting_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_step: Mapped[str | None] = mapped_column(String, nullable=True)
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    follow_up_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    attachment_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    account = relationship("Account", back_populates="activities")
    opportunity = relationship("Opportunity", back_populates="activities")
    contact = relationship("Contact", foreign_keys=[contact_id])
    contacts = relationship("Contact", secondary=activity_contacts)
    created_by = relationship("User", foreign_keys=[created_by_id])
