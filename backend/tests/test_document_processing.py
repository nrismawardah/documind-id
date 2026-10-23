
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services.document_processing import process_document


def configure_document_updates(client):
    """Mock successful conditional status updates."""
    table = client.table.return_value

    # Initial transition: uploaded/failed -> processing.
    table.update.return_value.eq.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
        {"id": "test-document"}
    ]

    # Final transition: processing -> ready.
    table.update.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "test-document"}
    ]


@patch("backend.app.services.document_processing.generate_embeddings")
@patch("backend.app.services.document_processing.save_document_chunks")
@patch("backend.app.services.document_processing.chunk_pages")
@patch("backend.app.services.document_processing.extract_pdf_text")
@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_success(
    mock_get_document,
    mock_get_client,
    mock_extract,
    mock_chunk_pages,
    mock_save_chunks,
    mock_generate_embeddings,
):
    document_id = uuid4()
    user_id = uuid4()
    storage_path = f"{user_id}/test-document.pdf"

    mock_get_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": storage_path,
    }

    client = MagicMock()
    mock_get_client.return_value = client
    configure_document_updates(client)

    client.storage.from_.return_value.download.return_value = b"%PDF-test"

    pages = [
        {"page_number": 1, "text": "Halaman pertama"},
        {"page_number": 2, "text": "Halaman kedua"},
    ]
    mock_extract.return_value = {"page_count": 2, "pages": pages}

    chunks = [
        {
            "chunk_index": 0,
            "page_number": 1,
            "content": "Halaman pertama",
        },
        {
            "chunk_index": 1,
            "page_number": 2,
            "content": "Halaman kedua",
        },
    ]
    mock_chunk_pages.return_value = chunks
    mock_save_chunks.return_value = 2
    mock_generate_embeddings.return_value = [
        [0.1] * 768,
        [0.2] * 768,
    ]

    result = process_document(document_id, user_id)

    assert result["document_id"] == str(document_id)
    assert result["page_count"] == 2
    assert result["chunk_count"] == 2
    assert result["status"] == "ready"
    assert result["pages"] == pages

    client.storage.from_.assert_called_once_with("documents")
    client.storage.from_.return_value.download.assert_called_once_with(
        storage_path
    )
    mock_extract.assert_called_once_with(b"%PDF-test")
    mock_chunk_pages.assert_called_once_with(pages)
    mock_generate_embeddings.assert_called_once_with(
        ["Halaman pertama", "Halaman kedua"]
    )
    mock_save_chunks.assert_called_once_with(
        document_id=document_id,
        user_id=user_id,
        chunks=chunks,
    )

    assert client.table.call_count == 2
    client.table.assert_any_call("documents")

    updates = client.table.return_value.update.call_args_list
    assert updates[0].args[0] == {
        "status": "processing",
        "error_message": None,
    }
    assert updates[1].args[0] == {
        "page_count": 2,
        "status": "ready",
        "error_message": None,
    }


@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_not_found(
    mock_get_document,
    mock_get_client,
):
    document_id = uuid4()
    user_id = uuid4()

    mock_get_document.side_effect = HTTPException(
        status_code=404,
        detail="Document not found",
    )

    with pytest.raises(HTTPException) as exc_info:
        process_document(document_id, user_id)

    assert exc_info.value.status_code == 404
    mock_get_client.assert_not_called()


@patch("backend.app.services.document_processing.save_document_chunks")
@patch("backend.app.services.document_processing.extract_pdf_text")
@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_extraction_failure(
    mock_get_document,
    mock_get_client,
    mock_extract,
    mock_save_chunks,
):
    document_id = uuid4()
    user_id = uuid4()

    mock_get_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/test-document.pdf",
    }

    client = MagicMock()
    mock_get_client.return_value = client
    configure_document_updates(client)

    client.storage.from_.return_value.download.return_value = b"%PDF-test"
    mock_extract.side_effect = ValueError("Invalid PDF")

    with pytest.raises(HTTPException) as exc_info:
        process_document(document_id, user_id)

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to process document"
    mock_save_chunks.assert_not_called()

    updates = client.table.return_value.update.call_args_list
    assert updates[0].args[0] == {
        "status": "processing",
        "error_message": None,
    }
    assert updates[1].args[0] == {
        "status": "failed",
        "error_message": "Document processing failed",
    }


@patch("backend.app.services.document_processing.generate_embeddings")
@patch("backend.app.services.document_processing.save_document_chunks")
@patch("backend.app.services.document_processing.chunk_pages")
@patch("backend.app.services.document_processing.extract_pdf_text")
@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_chunk_save_failure(
    mock_get_document,
    mock_get_client,
    mock_extract,
    mock_chunk_pages,
    mock_save_chunks,
    mock_generate_embeddings,
):
    document_id = uuid4()
    user_id = uuid4()

    mock_get_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/test-document.pdf",
    }

    client = MagicMock()
    mock_get_client.return_value = client
    configure_document_updates(client)

    client.storage.from_.return_value.download.return_value = b"%PDF-test"
    mock_extract.return_value = {
        "page_count": 1,
        "pages": [{"page_number": 1, "text": "Teks pengujian"}],
    }
    mock_chunk_pages.return_value = [
        {
            "chunk_index": 0,
            "page_number": 1,
            "content": "Teks pengujian",
        }
    ]
    mock_save_chunks.side_effect = HTTPException(
        status_code=503,
        detail="Unable to save document chunks",
    )
    mock_generate_embeddings.return_value = [[0.1] * 768]

    with pytest.raises(HTTPException) as exc_info:
        process_document(document_id, user_id)

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to process document"

    updates = client.table.return_value.update.call_args_list
    assert updates[0].args[0] == {
        "status": "processing",
        "error_message": None,
    }
    assert updates[1].args[0] == {
        "status": "failed",
        "error_message": "Document processing failed",
    }

@patch("backend.app.services.document_processing.chunk_pages")
@patch("backend.app.services.document_processing.extract_pdf_text")
@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_empty_chunks(
    mock_get_document,
    mock_get_client,
    mock_extract,
    mock_chunk_pages,
):
    document_id = uuid4()
    user_id = uuid4()

    mock_get_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/test-document.pdf",
    }

    client = MagicMock()
    mock_get_client.return_value = client
    configure_document_updates(client)

    client.storage.from_.return_value.download.return_value = b"%PDF-test"
    mock_extract.return_value = {"page_count": 0, "pages": []}
    mock_chunk_pages.return_value = []

    with pytest.raises(HTTPException) as exc_info:
        process_document(document_id, user_id)

    assert exc_info.value.status_code == 422

    updates = client.table.return_value.update.call_args_list
    assert updates[-1].args[0]["status"] == "failed"

@patch("backend.app.services.document_processing.save_document_chunks")
@patch("backend.app.services.document_processing.generate_embeddings")
@patch("backend.app.services.document_processing.chunk_pages")
@patch("backend.app.services.document_processing.extract_pdf_text")
@patch("backend.app.services.document_processing.get_supabase_client")
@patch("backend.app.services.document_processing.get_owned_document")
def test_process_document_zero_saved_chunks(
    mock_get_document,
    mock_get_client,
    mock_extract,
    mock_chunk_pages,
    mock_generate_embeddings,
    mock_save_chunks,
):
    document_id = uuid4()
    user_id = uuid4()

    mock_get_document.return_value = {
        "id": str(document_id),
        "user_id": str(user_id),
        "storage_path": f"{user_id}/test-document.pdf",
    }

    client = MagicMock()
    mock_get_client.return_value = client
    configure_document_updates(client)

    client.storage.from_.return_value.download.return_value = b"%PDF-test"
    mock_extract.return_value = {
        "page_count": 1,
        "pages": [{"page_number": 1, "text": "Teks pengujian"}],
    }
    mock_chunk_pages.return_value = [
        {
            "chunk_index": 0,
            "page_number": 1,
            "content": "Teks pengujian",
        }
    ]
    mock_generate_embeddings.return_value = [[0.1] * 768]
    mock_save_chunks.return_value = 0

    with pytest.raises(HTTPException) as exc_info:
        process_document(document_id, user_id)

    assert exc_info.value.status_code == 422

    updates = client.table.return_value.update.call_args_list
    assert updates[-1].args[0]["status"] == "failed"
