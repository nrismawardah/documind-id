
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services.document_upload import store_document_pdf


@patch("backend.app.services.document_upload.get_supabase_client")
def test_store_document_pdf_success(mock_get_client):
    user_id = uuid4()
    file_bytes = b"%PDF-1.7 test content"

    document = {
        "id": str(uuid4()),
        "user_id": str(user_id),
        "filename": "laporan.pdf",
        "storage_path": f"{user_id}/generated.pdf",
        "file_size_bytes": len(file_bytes),
        "status": "uploaded",
    }

    mock_client = MagicMock()
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        SimpleNamespace(data=[document])
    )
    mock_get_client.return_value = mock_client

    result = store_document_pdf(
        user_id=user_id,
        filename="laporan.pdf",
        file_bytes=file_bytes,
    )

    assert result == document

    mock_client.storage.from_.assert_called_once_with("documents")
    mock_client.storage.from_.return_value.upload.assert_called_once()

    insert_payload = (
        mock_client.table.return_value.insert.call_args.args[0]
    )
    assert insert_payload["user_id"] == str(user_id)
    assert insert_payload["filename"] == "laporan.pdf"
    assert insert_payload["file_size_bytes"] == len(file_bytes)
    assert insert_payload["status"] == "uploaded"


@patch("backend.app.services.document_upload.get_supabase_client")
def test_store_document_pdf_storage_failure(mock_get_client):
    mock_client = MagicMock()
    mock_client.storage.from_.return_value.upload.side_effect = Exception(
        "Storage unavailable"
    )
    mock_get_client.return_value = mock_client

    with pytest.raises(HTTPException) as exc_info:
        store_document_pdf(
            user_id=uuid4(),
            filename="laporan.pdf",
            file_bytes=b"%PDF-1.7 test content",
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to upload PDF"

    mock_client.table.assert_not_called()


@patch("backend.app.services.document_upload.get_supabase_client")
def test_store_document_pdf_rolls_back_when_metadata_fails(
    mock_get_client,
):
    user_id = uuid4()
    mock_client = MagicMock()

    mock_client.table.return_value.insert.return_value.execute.side_effect = (
        Exception("Database unavailable")
    )
    mock_get_client.return_value = mock_client

    with pytest.raises(HTTPException) as exc_info:
        store_document_pdf(
            user_id=user_id,
            filename="laporan.pdf",
            file_bytes=b"%PDF-1.7 test content",
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to save document metadata"

    upload_call = (
        mock_client.storage.from_.return_value.upload.call_args
    )
    storage_path = upload_call.args[0]

    mock_client.storage.from_.return_value.remove.assert_called_once_with(
        [storage_path]
    )
