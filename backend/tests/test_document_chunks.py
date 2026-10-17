
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services.document_chunks import save_document_chunks


@patch("backend.app.services.document_chunks.get_supabase_client")
def test_save_document_chunks_success(mock_get_client):
    document_id = uuid4()
    user_id = uuid4()

    client = MagicMock()
    mock_get_client.return_value = client

    chunks = [
        {
            "chunk_index": 0,
            "page_number": 1,
            "content": "Teks chunk pertama",
        },
        {
            "chunk_index": 1,
            "page_number": 2,
            "content": "Teks chunk kedua",
        },
    ]

    client.rpc.return_value.execute.return_value.data = 2

    result = save_document_chunks(document_id, user_id, chunks)

    assert result == 2

    client.rpc.assert_called_once_with(
        "replace_document_chunks",
        {
            "p_document_id": str(document_id),
            "p_user_id": str(user_id),
            "p_chunks": chunks,
        },
    )

    client.rpc.return_value.execute.assert_called_once()


@patch("backend.app.services.document_chunks.get_supabase_client")
def test_save_document_chunks_empty_list(mock_get_client):
    document_id = uuid4()
    user_id = uuid4()

    client = MagicMock()
    mock_get_client.return_value = client
    client.rpc.return_value.execute.return_value.data = 0

    result = save_document_chunks(document_id, user_id, [])

    assert result == 0

    client.rpc.assert_called_once_with(
        "replace_document_chunks",
        {
            "p_document_id": str(document_id),
            "p_user_id": str(user_id),
            "p_chunks": [],
        },
    )


@patch("backend.app.services.document_chunks.get_supabase_client")
def test_save_document_chunks_database_failure(mock_get_client):
    document_id = uuid4()
    user_id = uuid4()

    client = MagicMock()
    mock_get_client.return_value = client

    client.rpc.return_value.execute.side_effect = Exception(
        "Database unavailable"
    )

    with pytest.raises(HTTPException) as exc_info:
        save_document_chunks(
            document_id,
            user_id,
            [
                {
                    "chunk_index": 0,
                    "page_number": 1,
                    "content": "Contoh teks",
                }
            ],
        )

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to save document chunks"
