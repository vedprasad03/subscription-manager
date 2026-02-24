import json

import anthropic

from app.core.config import settings

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


_EXTRACTION_SYSTEM = """You are a subscription detection engine. Given an email's sender, subject, and body snippet, determine whether it relates to a recurring subscription or billing event.

If it does, extract the following fields and return them as a single JSON object. If it does not relate to a subscription, return null.

Fields:
- service_name (string): the name of the service or product
- cost_amount (number or null): the charge amount (numeric only, no currency symbol)
- cost_currency (string): 3-letter ISO currency code, default "USD"
- billing_cycle (string or null): one of "monthly", "annual", "weekly", "other"
- next_renewal_date (string or null): ISO 8601 date (YYYY-MM-DD) of next charge, if found
- status (string): one of "active", "cancelled", "trial"
- confidence (number): 0.0 to 1.0 — how confident you are this is a subscription email

Return ONLY the JSON object or null. No explanation, no markdown."""


def extract_subscription(email: dict) -> dict | None:
    """
    Given an email dict {sender, subject, snippet, body, date},
    return extracted subscription fields or None.
    """
    user_content = (
        f"From: {email.get('sender', '')}\n"
        f"Subject: {email.get('subject', '')}\n"
        f"Date: {email.get('date', '')}\n\n"
        f"{email.get('body') or email.get('snippet', '')}"
    )

    client = _get_client()
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=_EXTRACTION_SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = message.content[0].text.strip()
    if raw.lower() == "null":
        return None

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None

    if not isinstance(data, dict) or not data.get("service_name"):
        return None

    # Only keep fields that map to our Subscription model
    return {
        "service_name": data.get("service_name"),
        "cost_amount": data.get("cost_amount"),
        "cost_currency": data.get("cost_currency", "USD"),
        "billing_cycle": data.get("billing_cycle"),
        "next_renewal_date": data.get("next_renewal_date"),
        "status": data.get("status", "active"),
        "confidence_score": data.get("confidence"),
    }
