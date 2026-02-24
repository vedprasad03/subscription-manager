from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    service_name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cost_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    cost_currency: Mapped[str] = mapped_column(String(3), default="USD")
    # "monthly" | "annual" | "weekly" | "other"
    billing_cycle: Mapped[str | None] = mapped_column(String(20), nullable=True)
    next_renewal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # "active" | "cancelled" | "trial" | "paused"
    status: Mapped[str] = mapped_column(String(20), default="active")
    # "detected" | "manual"
    source: Mapped[str] = mapped_column(String(20), default="manual")
    confidence_score: Mapped[float | None] = mapped_column(nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship(back_populates="subscriptions")
    suggestions: Mapped[list["Suggestion"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")
