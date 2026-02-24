from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class SubscriptionCreate(BaseModel):
    service_name: str
    cost_amount: Decimal | None = None
    cost_currency: str = "USD"
    billing_cycle: str | None = None
    next_renewal_date: date | None = None
    status: str = "active"
    notes: str | None = None


class SubscriptionUpdate(BaseModel):
    service_name: str | None = None
    cost_amount: Decimal | None = None
    cost_currency: str | None = None
    billing_cycle: str | None = None
    next_renewal_date: date | None = None
    status: str | None = None
    notes: str | None = None


class SubscriptionOut(BaseModel):
    id: int
    user_id: int
    service_name: str
    logo_url: str | None
    cost_amount: Decimal | None
    cost_currency: str
    billing_cycle: str | None
    next_renewal_date: date | None
    status: str
    source: str
    confidence_score: float | None
    notes: str | None
    detected_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}
