import json
import re

import anthropic

from app.core.config import settings

_client: anthropic.Anthropic | None = None

BATCH_SIZE = 10


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


_EXTRACTION_SYSTEM = """You are a subscription detection engine. Given a numbered list of emails, identify which ones are confirmed receipts, invoices, or renewal notices for active recurring flat-rate subscriptions.

Only return a subscription object if ALL of the following are true:
- The email confirms a charge that has already been made, or confirms an upcoming renewal for a subscription the user is currently paying for
- The service charges a fixed recurring fee (not usage-based billing where the amount varies by consumption)
- The email is a transactional message to this specific user, not a mass promotion

Return null for:
- Promotional or marketing emails advertising a subscription or free trial the user has not yet started
- Usage-based billing (e.g. AWS, GCP, Azure — where charges vary by consumption)
- One-time purchases with no recurring component
- Emails that merely mention a subscription without confirming a charge or renewal

For service_name, always use the canonical brand name only — no plan tiers or qualifiers (e.g. "Netflix" not "Netflix Standard with Ads", "Anthropic" not "Claude Pro", "Amazon" not "Amazon Prime Video").

Return a JSON array with exactly one entry per email, in the same order as the input. Each entry must be either:
- A JSON object with these fields:
  - service_name (string): canonical brand name
  - cost_amount (number or null): charge amount, numeric only, no currency symbol
  - cost_currency (string): 3-letter ISO currency code, default "USD"
  - billing_cycle (string or null): one of "monthly", "annual", "weekly", "other"
  - next_renewal_date (string or null): ISO 8601 date YYYY-MM-DD of next charge, if present
  - status (string): one of "active", "cancelled", "trial"
  - confidence (number): 0.0 to 1.0 — be conservative; only use >0.8 when you are certain
- null if the email does not meet the criteria above

Return ONLY the JSON array. No explanation, no markdown."""


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _normalize(item: dict) -> dict:
    return {
        "service_name": item.get("service_name"),
        "cost_amount": item.get("cost_amount"),
        "cost_currency": item.get("cost_currency", "USD"),
        "billing_cycle": item.get("billing_cycle"),
        "next_renewal_date": item.get("next_renewal_date"),
        "status": item.get("status", "active"),
        "confidence_score": item.get("confidence"),
    }


def extract_subscriptions_batch(emails: list[dict]) -> list[dict | None]:
    """
    Given a list of email dicts, return a parallel list of extracted
    subscription dicts or None for non-subscription emails.
    """
    if not emails:
        return []

    parts = []
    for i, email in enumerate(emails, 1):
        body = email.get("body") or email.get("snippet", "")
        parts.append(
            f"Email {i}:\n"
            f"From: {email.get('sender', '')}\n"
            f"Subject: {email.get('subject', '')}\n"
            f"Date: {email.get('date', '')}\n\n"
            f"{body}"
        )
    user_content = "\n\n---\n\n".join(parts)

    client = _get_client()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        system=_EXTRACTION_SYSTEM,
        messages=[{"role": "user", "content": user_content}],
    )

    raw = _strip_fences(message.content[0].text.strip())

    try:
        results = json.loads(raw)
    except json.JSONDecodeError:
        return [None] * len(emails)

    if not isinstance(results, list):
        return [None] * len(emails)

    # Pad or truncate to match input length
    results = results[: len(emails)]
    while len(results) < len(emails):
        results.append(None)

    return [
        _normalize(item) if isinstance(item, dict) and item.get("service_name") else None
        for item in results
    ]
