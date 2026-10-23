
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException
from jwt.exceptions import PyJWKClientConnectionError

from backend.app.core.auth import get_current_user


@pytest.fixture
def valid_credentials():
    credentials = MagicMock()
    credentials.credentials = "test-token"
    return credentials


@patch("backend.app.core.auth.get_settings")
def test_missing_credentials_returns_401(mock_settings):
    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials=None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Authentication required"


@patch("backend.app.core.auth.get_jwks_client")
@patch("backend.app.core.auth.get_settings")
def test_valid_token_returns_verified_claims(
    mock_settings,
    mock_get_jwks,
    valid_credentials,
):
    mock_settings.return_value.supabase_url = "https://example.supabase.co"

    signing_key = MagicMock()
    signing_key.key = "test-public-key"
    mock_get_jwks.return_value.get_signing_key_from_jwt.return_value = signing_key

    expected_claims = {
        "sub": "user-123",
        "aud": "authenticated",
        "iss": "https://example.supabase.co/auth/v1",
        "exp": 2_000_000_000,
    }

    with patch(
        "backend.app.core.auth.jwt.decode",
        return_value=expected_claims,
    ) as mock_decode:
        result = get_current_user(credentials=valid_credentials)

    assert result == expected_claims
    mock_decode.assert_called_once_with(
        "test-token",
        signing_key.key,
        algorithms=["ES256"],
        audience="authenticated",
        issuer="https://example.supabase.co/auth/v1",
        options={"require": ["exp", "sub", "aud", "iss"]},
    )


@patch("backend.app.core.auth.get_jwks_client")
@patch("backend.app.core.auth.get_settings")
def test_invalid_token_returns_401(
    mock_settings,
    mock_get_jwks,
    valid_credentials,
):
    mock_settings.return_value.supabase_url = "https://example.supabase.co"

    signing_key = MagicMock()
    signing_key.key = "test-public-key"
    mock_get_jwks.return_value.get_signing_key_from_jwt.return_value = signing_key

    with patch(
        "backend.app.core.auth.jwt.decode",
        side_effect=jwt.ExpiredSignatureError("Token expired"),
    ):
        with pytest.raises(HTTPException) as exc:
            get_current_user(credentials=valid_credentials)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid or expired access token"


@patch("backend.app.core.auth.get_jwks_client")
@patch("backend.app.core.auth.get_settings")
def test_jwks_connection_failure_returns_503(
    mock_settings,
    mock_get_jwks,
    valid_credentials,
):
    mock_settings.return_value.supabase_url = "https://example.supabase.co"
    mock_get_jwks.return_value.get_signing_key_from_jwt.side_effect = (
        PyJWKClientConnectionError("JWKS unavailable")
    )

    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials=valid_credentials)

    assert exc.value.status_code == 503
    assert exc.value.detail == "Authentication service temporarily unavailable"
