from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, decode_token
from app.models.oauth_token import OAuthToken
from app.models.user import User
from app.services import gmail as gmail_svc
from app.services.ai import extract_subscriptions_batch, BATCH_SIZE
from app.models.subscription import Subscription
from app.models.notification import Notification

router = APIRouter()


@router.get("/connect")
def connect_gmail(current_user: User = Depends(get_current_user)):
    """Return the Google OAuth URL for the frontend to redirect to."""
    state = create_access_token(str(current_user.id))
    url = gmail_svc.get_auth_url(state=state)
    return {"url": url}


@router.get("/callback")
def gmail_callback(code: str, state: str, db: Session = Depends(get_db)):
    """
    Google redirects here after user grants permission.
    The state parameter is a signed JWT containing the user ID.
    """
    try:
        claims = decode_token(state)
        user_id = int(claims["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    token_data = gmail_svc.exchange_code(code)

    existing = (
        db.query(OAuthToken)
        .filter(OAuthToken.user_id == user_id, OAuthToken.provider == "gmail")
        .first()
    )
    if existing:
        existing.access_token = token_data["access_token"]
        existing.refresh_token = token_data["refresh_token"]
        existing.scopes = token_data["scopes"]
        existing.expires_at = token_data["expires_at"]
    else:
        db.add(OAuthToken(user_id=user_id, provider="gmail", **token_data))

    db.commit()
    return RedirectResponse(url=f"{settings.frontend_url}/connect-gmail/success")


@router.post("/connect/{user_id}/finalize")
def finalize_gmail_connection(
    user_id: int,
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Associate a Gmail OAuth code with the authenticated user."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    token_data = gmail_svc.exchange_code(code)

    existing = (
        db.query(OAuthToken)
        .filter(OAuthToken.user_id == user_id, OAuthToken.provider == "gmail")
        .first()
    )
    if existing:
        existing.access_token = token_data["access_token"]
        existing.refresh_token = token_data["refresh_token"]
        existing.scopes = token_data["scopes"]
        existing.expires_at = token_data["expires_at"]
    else:
        db.add(OAuthToken(user_id=user_id, provider="gmail", **token_data))

    db.commit()
    return {"status": "connected"}


@router.delete("/disconnect")
def disconnect_gmail(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = (
        db.query(OAuthToken)
        .filter(OAuthToken.user_id == current_user.id, OAuthToken.provider == "gmail")
        .first()
    )
    if token:
        db.delete(token)
        db.commit()
    return {"status": "disconnected"}


@router.get("/status")
def gmail_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token = (
        db.query(OAuthToken)
        .filter(OAuthToken.user_id == current_user.id, OAuthToken.provider == "gmail")
        .first()
    )
    return {
        "connected": token is not None,
        "last_sync_at": token.last_sync_at if token else None,
    }


@router.post("/scan")
def scan_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger an inbox scan for the current user."""
    token = (
        db.query(OAuthToken)
        .filter(OAuthToken.user_id == current_user.id, OAuthToken.provider == "gmail")
        .first()
    )
    if not token:
        raise HTTPException(status_code=400, detail="Gmail not connected")

    service = gmail_svc.build_gmail_service(token.access_token, token.refresh_token)
    emails_gen = gmail_svc.fetch_subscription_emails(service, after_date=token.last_sync_at)

    # Stage 1: local keyword pre-filter — eliminate obvious non-subscription emails
    candidates = [e for e in emails_gen if gmail_svc.is_subscription_candidate(e)]

    # Stage 2: batch Claude extraction
    created = 0
    for i in range(0, len(candidates), BATCH_SIZE):
        batch = candidates[i : i + BATCH_SIZE]
        try:
            results = extract_subscriptions_batch(batch)
        except Exception:
            continue

        for extracted in results:
            if not extracted:
                continue
            if (extracted.get("confidence_score") or 0) < 0.7:
                continue

            # Upsert: match on service_name per user
            existing = (
                db.query(Subscription)
                .filter(
                    Subscription.user_id == current_user.id,
                    Subscription.service_name == extracted["service_name"],
                )
                .first()
            )
            if existing:
                for k, v in extracted.items():
                    if v is not None:
                        setattr(existing, k, v)
                existing.detected_at = datetime.now(timezone.utc)
            else:
                sub = Subscription(
                    user_id=current_user.id,
                    source="detected",
                    detected_at=datetime.now(timezone.utc),
                    **extracted,
                )
                db.add(sub)
                created += 1

                # Notify user of new detection
                db.add(Notification(
                    user_id=current_user.id,
                    type="new_subscription",
                    title=f"New subscription detected: {extracted['service_name']}",
                    body=f"We found a subscription for {extracted['service_name']} in your inbox.",
                ))

    token.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    return {"scanned": True, "new_subscriptions": created}
