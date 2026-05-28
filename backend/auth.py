from base64 import urlsafe_b64decode
import json
import logging
import time
from typing import Any

import httpx
from fastapi import Header, HTTPException

from config import settings

logger = logging.getLogger(__name__)


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(401, "Invalid bearer token")

    payload_segment = parts[1]
    padding = "=" * (-len(payload_segment) % 4)

    try:
        decoded_bytes = urlsafe_b64decode(f"{payload_segment}{padding}")
        payload = json.loads(decoded_bytes.decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(401, "Invalid bearer token payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(401, "Invalid bearer token payload")

    return payload


def _build_dev_user_from_token(token: str) -> dict[str, Any]:
    payload = _decode_jwt_payload(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid bearer token payload")

    expires_at = payload.get("exp")
    if isinstance(expires_at, (int, float)) and expires_at <= time.time():
        raise HTTPException(401, "Session expired")

    issuer = payload.get("iss")
    expected_issuer = f"{settings.supabase_url}/auth/v1"
    if issuer and issuer != expected_issuer:
        raise HTTPException(401, "Invalid bearer token issuer")

    audience = payload.get("aud")
    if audience and audience not in {"authenticated", "anon"}:
        raise HTTPException(401, "Invalid bearer token audience")

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
    }


async def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization:
        raise HTTPException(401, "Missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Invalid authorization header")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_anon_key,
                },
            )
    except httpx.HTTPError as exc:
        if settings.environment == "development":
            logger.warning("Supabase auth validation unavailable in development; falling back to JWT payload parsing.")
            return _build_dev_user_from_token(token)
        raise HTTPException(503, f"Auth validation unavailable: {exc}") from exc

    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired session")

    user = response.json()
    if not user.get("id"):
        raise HTTPException(401, "Invalid auth payload")
    return user


def get_project_for_user(db: Any, project_id: str, user_id: str) -> dict[str, Any]:
    result = (
        db.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Project not found")
    return result.data
