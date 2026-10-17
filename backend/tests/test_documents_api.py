
from uuid import uuid4
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from backend.app.core.auth import get_current_user

client = TestClient(app)


def test_get_document_requires_authentication():
    response = client.get(f"/documents/{uuid4()}")

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication required"
    }


@patch("backend.app.api.documents.get_owned_document")
def test_get_document_returns_owned_document(mock_get_document):
    user_id = uuid4()
    document_id = uuid4()

    document = {
        "id": str(document_id),
        "user_id": str(user_id),
        "filename": "contoh.pdf",
    }

    mock_get_document.return_value = document

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.get(f"/documents/{document_id}")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json() == document

    mock_get_document.assert_called_once_with(
        document_id=document_id,
        user_id=user_id,
    )


def test_get_document_rejects_invalid_uuid():
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(uuid4()),
        "role": "authenticated",
    }

    try:
        response = client.get("/documents/bukan-uuid")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 422
