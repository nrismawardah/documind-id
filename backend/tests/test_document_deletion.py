
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services.document_deletion import delete_document


@pytest.fixture
def document_ids():
    return uuid4(), uuid4()


@patch("backend.app.services.document_deletion.get_supabase_client")
@patch("backend.app.services.document_deletion.get_owned_document")
def test_delete_document_success(
    mock_get_owned_document,
    mock_get_supabase_client,
    document_ids,
):
    document_id, user_id = document_ids

    mock_get_owned_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/{document_id}.pdf",
    }

    client = MagicMock()
    mock_get_supabase_client.return_value = client

    client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": str(document_id)}
    ]

    result = delete_document(document_id, user_id)

    mock_get_owned_document.assert_called_once_with(
        document_id=document_id,
        user_id=user_id,
    )
    client.storage.from_.assert_called_once_with("documents")
    client.storage.from_.return_value.remove.assert_called_once_with(
        [f"{user_id}/{document_id}.pdf"]
    )
    assert result["message"] == "Document deleted successfully"
    assert result["document_id"] == str(document_id)


@patch("backend.app.services.document_deletion.get_supabase_client")
@patch("backend.app.services.document_deletion.get_owned_document")
def test_delete_document_not_owned(
    mock_get_owned_document,
    mock_get_supabase_client,
    document_ids,
):
    document_id, user_id = document_ids

    mock_get_owned_document.side_effect = HTTPException(
        status_code=404,
        detail="Document not found",
    )

    with pytest.raises(HTTPException) as exc_info:
        delete_document(document_id, user_id)

    assert exc_info.value.status_code == 404
    mock_get_supabase_client.assert_not_called()


@patch("backend.app.services.document_deletion.get_supabase_client")
@patch("backend.app.services.document_deletion.get_owned_document")
def test_delete_document_storage_failure(
    mock_get_owned_document,
    mock_get_supabase_client,
    document_ids,
):
    document_id, user_id = document_ids

    mock_get_owned_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/{document_id}.pdf",
    }

    client = MagicMock()
    mock_get_supabase_client.return_value = client
    client.storage.from_.return_value.remove.side_effect = Exception(
        "Storage unavailable"
    )

    with pytest.raises(HTTPException) as exc_info:
        delete_document(document_id, user_id)

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == (
    "Unable to delete document file. Please retry deletion."
    )
    client.table.return_value.delete.assert_not_called()


@patch("backend.app.services.document_deletion.get_supabase_client")
@patch("backend.app.services.document_deletion.get_owned_document")
def test_delete_document_metadata_failure(
    mock_get_owned_document,
    mock_get_supabase_client,
    document_ids,
):
    document_id, user_id = document_ids

    mock_get_owned_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/{document_id}.pdf",
    }

    client = MagicMock()
    mock_get_supabase_client.return_value = client

    client.table.return_value.delete.return_value.eq.return_value.eq.return_value.eq.return_value.execute.side_effect = Exception(
        "Database unavailable"
    )

    with pytest.raises(HTTPException) as exc_info:
        delete_document(document_id, user_id)

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == (
        "The document file was deleted, but its metadata remains. "
        "Please retry deletion."
    )
    client.storage.from_.return_value.remove.assert_called_once()
