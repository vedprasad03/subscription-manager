import base64
import re
from datetime import datetime, timezone
from typing import Generator

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.core.config import settings
from app.core.security import decrypt, encrypt

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def build_flow() -> Flow:
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [settings.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )


def get_auth_url() -> str:
    flow = build_flow()
    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return url


def exchange_code(code: str) -> dict:
    """Exchange auth code for token dict with encrypted values."""
    flow = build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": encrypt(creds.token),
        "refresh_token": encrypt(creds.refresh_token) if creds.refresh_token else None,
        "scopes": " ".join(creds.scopes or []),
        "expires_at": creds.expiry,
    }


def build_gmail_service(access_token: str, refresh_token: str | None):
    creds = Credentials(
        token=decrypt(access_token),
        refresh_token=decrypt(refresh_token) if refresh_token else None,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    return build("gmail", "v1", credentials=creds)


def _decode_body(payload: dict) -> str:
    """Recursively extract plain-text body from a Gmail message payload."""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
    for part in payload.get("parts", []):
        text = _decode_body(part)
        if text:
            return text
    return ""


def fetch_subscription_emails(
    service, after_date: datetime | None = None
) -> Generator[dict, None, None]:
    """
    Yield dicts of {sender, subject, snippet, body} for emails that look
    like subscription/billing messages. Yields at most 500 chars of body.
    """
    query_parts = [
        "subject:(receipt OR invoice OR subscription OR billing OR payment OR renewal OR charged OR \"your plan\")",
    ]
    if after_date:
        ts = int(after_date.timestamp())
        query_parts.append(f"after:{ts}")

    query = " ".join(query_parts)

    page_token = None
    while True:
        kwargs = {"userId": "me", "q": query, "maxResults": 100}
        if page_token:
            kwargs["pageToken"] = page_token

        result = service.users().messages().list(**kwargs).execute()
        messages = result.get("messages", [])

        for msg_ref in messages:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=msg_ref["id"], format="full")
                .execute()
            )
            headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
            body = _decode_body(msg.get("payload", {}))
            yield {
                "sender": headers.get("from", ""),
                "subject": headers.get("subject", ""),
                "snippet": msg.get("snippet", ""),
                "body": body[:500],
                "date": headers.get("date", ""),
            }

        page_token = result.get("nextPageToken")
        if not page_token:
            break
