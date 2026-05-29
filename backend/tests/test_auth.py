import json
import time
import unittest
from base64 import urlsafe_b64encode
from unittest.mock import patch

import httpx
from fastapi import HTTPException

import auth


def make_token(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}

    def encode_segment(data: dict) -> str:
        raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
        return urlsafe_b64encode(raw).decode("utf-8").rstrip("=")

    return f"{encode_segment(header)}.{encode_segment(payload)}.signature"


class RaisingAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, *args, **kwargs):
        raise httpx.ConnectError("All connection attempts failed")


class AuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_get_current_user_falls_back_to_token_in_development(self):
        token = make_token({
            "sub": "user-123",
            "email": "dev@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iss": f"{auth.settings.supabase_url}/auth/v1",
            "exp": int(time.time()) + 3600,
        })

        with patch.object(auth.settings, "environment", "development"):
            with patch("auth.httpx.AsyncClient", RaisingAsyncClient):
                user = await auth.get_current_user(f"Bearer {token}")

        self.assertEqual(user["id"], "user-123")
        self.assertEqual(user["email"], "dev@example.com")

    async def test_get_current_user_rejects_expired_dev_token(self):
        token = make_token({
            "sub": "user-123",
            "aud": "authenticated",
            "iss": f"{auth.settings.supabase_url}/auth/v1",
            "exp": int(time.time()) - 1,
        })

        with patch.object(auth.settings, "environment", "development"):
            with patch("auth.httpx.AsyncClient", RaisingAsyncClient):
                with self.assertRaises(HTTPException) as context:
                    await auth.get_current_user(f"Bearer {token}")

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Session expired")


if __name__ == "__main__":
    unittest.main()
