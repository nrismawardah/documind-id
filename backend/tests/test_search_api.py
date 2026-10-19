
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app
from backend.app.core.auth import get_current_user

client = TestClient(app)


def test_ask_documents_requires_authentication():
    response = client.post(
        "/search/ask",
        json={"query": "Apa isi dokumen ini?"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Authentication required"
    }


@patch("backend.app.api.search.generate_answer_with_sources")
@patch("backend.app.api.search.search_document_chunks")
def test_ask_documents_returns_answer_and_sources(
    mock_search,
    mock_generate_answer,
):
    user_id = uuid4()
    document_id = uuid4()

    mock_search.return_value = [
        {
            "document_id": str(document_id),
            "filename": "contoh.pdf",
            "page_number": 3,
            "chunk_index": 0,
            "content": "Dokumen menjelaskan tiga faktor utama.",
            "similarity": 0.92,
        }
    ]

    mock_generate_answer.return_value = {
        "answer": "Dokumen menjelaskan tiga faktor utama.",
        "source_indices": [0],
    }

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            "/search/ask",
            json={"query": "Apa faktor utamanya?"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200

    data = response.json()
    assert data["query"] == "Apa faktor utamanya?"
    assert data["answer"] == "Dokumen menjelaskan tiga faktor utama."
    assert len(data["sources"]) == 1
    assert data["sources"][0]["filename"] == "contoh.pdf"
    assert data["sources"][0]["page_number"] == 3
    assert data["sources"][0]["document_id"] == str(document_id)

    mock_search.assert_called_once_with(
        user_id=user_id,
        query="Apa faktor utamanya?",
        match_count=20,
        match_threshold=0.0,
        document_id=None,
    )

    mock_generate_answer.assert_called_once()


@patch("backend.app.api.search.generate_answer_with_sources")
@patch("backend.app.api.search.search_document_chunks")
def test_ask_documents_returns_only_selected_sources(
    mock_search,
    mock_generate_answer,
):
    user_id = uuid4()
    document_id = uuid4()

    mock_search.return_value = [
        {
            "document_id": str(document_id),
            "filename": "contoh.pdf",
            "page_number": 1,
            "chunk_index": 0,
            "content": "Pendahuluan penelitian.",
            "similarity": 0.91,
        },
        {
            "document_id": str(document_id),
            "filename": "contoh.pdf",
            "page_number": 3,
            "chunk_index": 2,
            "content": "Dataset penelitian berisi 1.025 pasien.",
            "similarity": 0.87,
        },
    ]

    # Gemini hanya memilih kandidat kedua.
    mock_generate_answer.return_value = {
        "answer": "Dataset penelitian berisi 1.025 pasien.",
        "source_indices": [1],
    }

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            "/search/ask",
            json={"query": "Berapa jumlah pasien?"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200

    data = response.json()
    assert data["answer"] == "Dataset penelitian berisi 1.025 pasien."
    assert len(data["sources"]) == 1
    assert data["sources"][0]["page_number"] == 3
    assert "1.025 pasien" in data["sources"][0]["content"]


@patch("backend.app.api.search.search_document_chunks")
def test_ask_documents_returns_fallback_when_no_results(mock_search):
    user_id = uuid4()
    mock_search.return_value = []

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            "/search/ask",
            json={"query": "Apa isi dokumen ini?"},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200

    data = response.json()
    assert data["sources"] == []
    assert "tidak ditemukan" in data["answer"].lower()

    mock_search.assert_called_once()


@patch("backend.app.api.search.generate_answer_with_sources")
@patch("backend.app.api.search.search_document_chunks")
def test_ask_documents_hides_sources_when_information_is_not_found(
    mock_search,
    mock_generate_answer,
):
    user_id = uuid4()

    mock_search.return_value = [
        {
            "document_id": str(uuid4()),
            "filename": "contoh.pdf",
            "page_number": 3,
            "chunk_index": 0,
            "content": "Penelitian membahas metode klasifikasi.",
            "similarity": 0.85,
        }
    ]

    mock_generate_answer.return_value = {
        "answer": "[INFORMASI_TIDAK_DITEMUKAN]",
        "source_indices": [],
    }

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            "/search/ask",
            json={
                "query": "Siapa nama direktur perusahaan penerbit?"
            },
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200

    data = response.json()
    assert data["sources"] == []
    assert "tidak ditemukan" in data["answer"].lower()
