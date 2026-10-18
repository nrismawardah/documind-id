
from uuid import uuid4

import pytest
from fastapi import HTTPException

from backend.app.services import semantic_search


def test_search_rejects_empty_query():
    with pytest.raises(HTTPException) as exc:
        semantic_search.search_document_chunks(
            user_id=uuid4(),
            query="   ",
        )

    assert exc.value.status_code == 422


def test_search_rejects_query_over_2000_characters():
    with pytest.raises(HTTPException) as exc:
        semantic_search.search_document_chunks(
            user_id=uuid4(),
            query="a" * 2001,
        )

    assert exc.value.status_code == 422


@pytest.mark.parametrize(
    "match_count",
    [0, 21],
)
def test_search_rejects_invalid_match_count(match_count):
    with pytest.raises(HTTPException) as exc:
        semantic_search.search_document_chunks(
            user_id=uuid4(),
            query="tujuan proyek",
            match_count=match_count,
        )

    assert exc.value.status_code == 422


@pytest.mark.parametrize(
    "match_threshold",
    [-0.1, 1.1],
)
def test_search_rejects_invalid_threshold(match_threshold):
    with pytest.raises(HTTPException) as exc:
        semantic_search.search_document_chunks(
            user_id=uuid4(),
            query="tujuan proyek",
            match_threshold=match_threshold,
        )

    assert exc.value.status_code == 422


def test_search_returns_matching_chunks(monkeypatch):
    user_id = uuid4()
    document_id = uuid4()
    expected_results = [
        {
            "chunk_id": str(uuid4()),
            "document_id": str(document_id),
            "filename": "roadmap.pdf",
            "page_number": 2,
            "chunk_index": 1,
            "content": "Tujuan utama proyek adalah memudahkan pencarian dokumen.",
            "similarity": 0.89,
        }
    ]

    class FakeResponse:
        data = expected_results

    class FakeRPC:
        def execute(self):
            return FakeResponse()

    class FakeSupabase:
        def rpc(self, function_name, params):
            assert function_name == "match_document_chunks"
            assert params["p_user_id"] == str(user_id)
            assert params["p_document_id"] == str(document_id)
            assert params["p_match_count"] == 5
            assert params["p_query_embedding"] == [0.1, 0.2]
            return FakeRPC()

    monkeypatch.setattr(
        semantic_search,
        "generate_query_embedding",
        lambda query: [0.1, 0.2],
    )
    monkeypatch.setattr(
        semantic_search,
        "get_supabase_client",
        lambda: FakeSupabase(),
    )

    results = semantic_search.search_document_chunks(
        user_id=user_id,
        query="  tujuan utama proyek  ",
        document_id=document_id,
    )

    assert results == expected_results


def test_search_returns_empty_list_when_no_matches(monkeypatch):
    class FakeResponse:
        data = None

    class FakeRPC:
        def execute(self):
            return FakeResponse()

    class FakeSupabase:
        def rpc(self, function_name, params):
            return FakeRPC()

    monkeypatch.setattr(
        semantic_search,
        "generate_query_embedding",
        lambda query: [0.1, 0.2],
    )
    monkeypatch.setattr(
        semantic_search,
        "get_supabase_client",
        lambda: FakeSupabase(),
    )

    results = semantic_search.search_document_chunks(
        user_id=uuid4(),
        query="informasi yang tidak ditemukan",
    )

    assert results == []


def test_search_returns_503_when_service_fails(monkeypatch):
    monkeypatch.setattr(
        semantic_search,
        "generate_query_embedding",
        lambda query: (_ for _ in ()).throw(RuntimeError("internal error")),
    )

    with pytest.raises(HTTPException) as exc:
        semantic_search.search_document_chunks(
            user_id=uuid4(),
            query="tujuan proyek",
        )

    assert exc.value.status_code == 503
    assert exc.value.detail == "Semantic search is temporarily unavailable"
