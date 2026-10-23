
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app
from backend.app.core.auth import get_current_user

client = TestClient(app)


def setup_user():
    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(uuid4()),
        "role": "authenticated",
    }


def teardown_user():
    app.dependency_overrides.pop(get_current_user, None)


def test_upload_requires_authentication():
    response = client.post(
        "/documents",
        files={
            "file": (
                "contoh.pdf",
                b"%PDF-1.7 test",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 401


def test_upload_rejects_non_pdf_filename():
    setup_user()
    try:
        response = client.post(
            "/documents",
            files={
                "file": (
                    "contoh.txt",
                    b"%PDF-1.7 test",
                    "application/pdf",
                )
            },
        )
    finally:
        teardown_user()

    assert response.status_code == 415


def test_upload_rejects_invalid_pdf_signature():
    setup_user()
    try:
        response = client.post(
            "/documents",
            files={
                "file": (
                    "contoh.pdf",
                    b"This is not a PDF",
                    "application/pdf",
                )
            },
        )
    finally:
        teardown_user()

    assert response.status_code == 422


@patch("backend.app.api.documents.store_document_pdf")
def test_upload_accepts_valid_pdf(mock_store):
    user_id = uuid4()
    mock_store.return_value = {
        "id": str(uuid4()),
        "user_id": str(user_id),
        "filename": "contoh.pdf",
        "storage_path": f"{user_id}/test.pdf",
        "file_size_bytes": 13,
        "status": "uploaded",
    }

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            "/documents",
            files={
                "file": (
                    "contoh.pdf",
                    b"%PDF-1.7 test",
                    "application/pdf",
                )
            },
        )
    finally:
        teardown_user()

    assert response.status_code == 201
    assert response.json()["filename"] == "contoh.pdf"
    mock_store.assert_called_once()

@patch("backend.app.api.documents.store_document_pdf")
def test_upload_rejects_pdf_exceeding_size_limit(mock_store):
    setup_user()

    try:
        response = client.post(
            "/documents",
            files={
                "file": (
                    "besar.pdf",
                    b"%PDF-1.7 " + b"A" * (10 * 1024 * 1024),
                    "application/pdf",
                )
            },
        )
    finally:
        teardown_user()

    assert response.status_code == 413
    mock_store.assert_not_called()

@patch("backend.app.api.documents.store_document_pdf")
def test_upload_rejects_invalid_content_type(mock_store):
    setup_user()

    try:
        response = client.post(
            "/documents",
            files={
                "file": (
                    "contoh.pdf",
                    b"%PDF-1.7 test",
                    "text/plain",
                )
            },
        )
    finally:
        teardown_user()

    assert response.status_code == 415
    mock_store.assert_not_called()
