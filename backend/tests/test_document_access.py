
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services.document_access import get_owned_document


def build_mock_client(document):
    mock_client = MagicMock()
    mock_query = mock_client.table.return_value

    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.maybe_single.return_value = mock_query
    mock_query.execute.return_value = SimpleNamespace(data=document)

    return mock_client


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_owned_document_success(mock_get_client):
    user_id = uuid4()
    document_id = uuid4()

    document = {
        "id": str(document_id),
        "user_id": str(user_id),
        "filename": "contoh.pdf",
    }

    mock_get_client.return_value = build_mock_client(document)

    result = get_owned_document(document_id, user_id)

    assert result == document

    mock_client = mock_get_client.return_value
    mock_client.table.assert_called_once_with("documents")
    mock_client.table.return_value.eq.assert_any_call(
        "id", str(document_id)
    )
    mock_client.table.return_value.eq.assert_any_call(
        "user_id", str(user_id)
    )


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_owned_document_not_found_or_not_owned(mock_get_client):
    mock_get_client.return_value = build_mock_client(None)

    with pytest.raises(HTTPException) as exc_info:
        get_owned_document(uuid4(), uuid4())

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Document not found"


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_owned_document_database_failure(mock_get_client):
    mock_get_client.side_effect = Exception("Database unavailable")

    with pytest.raises(HTTPException) as exc_info:
        get_owned_document(uuid4(), uuid4())

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to verify document access"


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_user_documents_returns_only_user_query(mock_get_client):
    from backend.app.services.document_access import get_user_documents

    user_id = uuid4()
    documents = [
        {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "filename": "laporan.pdf",
        },
        {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "filename": "materi.pdf",
        },
    ]

    mock_get_client.return_value = build_mock_client_for_list(documents)

    result = get_user_documents(user_id)

    assert result == documents

    mock_query = mock_get_client.return_value.table.return_value
    mock_query.eq.assert_called_once_with("user_id", str(user_id))
    mock_query.order.assert_called_once_with("created_at", desc=True)


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_user_documents_returns_empty_list(mock_get_client):
    from backend.app.services.document_access import get_user_documents

    mock_get_client.return_value = build_mock_client_for_list(None)

    assert get_user_documents(uuid4()) == []


@patch("backend.app.services.document_access.get_supabase_client")
def test_get_user_documents_database_failure(mock_get_client):
    from backend.app.services.document_access import get_user_documents

    mock_get_client.side_effect = Exception("Database unavailable")

    with pytest.raises(HTTPException) as exc_info:
        get_user_documents(uuid4())

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == "Unable to retrieve documents"


def build_mock_client_for_list(documents):
    mock_client = MagicMock()
    mock_query = mock_client.table.return_value

    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.execute.return_value = SimpleNamespace(data=documents)

    return mock_client
