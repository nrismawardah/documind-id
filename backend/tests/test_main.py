from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app
from backend.app.core.auth import get_current_user

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to DocuMind ID API",
        "status": "running",
    }


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "documind-id-api",
    }


def test_docs_endpoint():
    response = client.get("/docs")

    assert response.status_code == 200


@patch("backend.app.api.health.get_supabase_client")
def test_supabase_health_endpoint_success(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    response = client.get("/health/supabase")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "supabase",
    }
    mock_client.table.assert_called_once_with("documents")


@patch("backend.app.api.health.get_supabase_client")
def test_supabase_health_endpoint_failure(mock_get_client):
    mock_get_client.side_effect = Exception("Internal test error")

    response = client.get("/health/supabase")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Supabase connection check failed",
    }

def test_auth_me_requires_authentication():
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication required",
    }


def test_auth_me_returns_verified_user_claims():
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": "test-user-id",
        "role": "authenticated",
    }

    try:
        response = client.get("/auth/me")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json() == {
        "id": "test-user-id",
        "role": "authenticated",
    }

def test_auth_me_rejects_malformed_token():
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid or expired access token"
    }


def test_auth_me_rejects_invalid_bearer_token():
    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Invalid or expired access token"
    }
