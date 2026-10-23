
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app
from backend.app.core.auth import get_current_user

client = TestClient(app)


@patch("backend.app.api.chat.serialize_message")
@patch("backend.app.api.chat.search_document_chunks")
@patch("backend.app.api.chat.generate_answer_with_sources")
@patch("backend.app.api.chat.get_supabase_client")
def test_chat_passes_previous_conversation_history_to_gemini(
    mock_get_supabase,
    mock_generate_answer,
    mock_search,
    mock_serialize,
):
    user_id = uuid4()
    conversation_id = uuid4()
    document_id = uuid4()
    user_message_id = str(uuid4())
    assistant_message_id = str(uuid4())

    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client

    # Percakapan dimiliki oleh pengguna yang sedang login.
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": str(conversation_id),
            "user_id": str(user_id),
            "document_id": str(document_id),
            "title": "Percakapan pengujian",
        }
    ]

    # Pesan terbaru berhasil disimpan.
    mock_client.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": user_message_id,
            "conversation_id": str(conversation_id),
            "role": "user",
            "content": "Jelaskan kembali hal tadi.",
        }
    ]

    # Riwayat berisi satu pertanyaan dan jawaban sebelumnya,
    # ditambah pesan pengguna terbaru yang harus dikeluarkan.
    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {
            "id": str(uuid4()),
            "role": "user",
            "content": "Apa nama proyek ini?",
        },
        {
            "id": str(uuid4()),
            "role": "assistant",
            "content": "Nama proyeknya DocuMind ID.",
        },
        {
            "id": user_message_id,
            "role": "user",
            "content": "Jelaskan kembali hal tadi.",
        },
    ]

    mock_search.return_value = [
        {
            "chunk_id": str(uuid4()),
            "document_id": str(document_id),
            "filename": "contoh.pdf",
            "page_number": 1,
            "content": "Nama proyek: DocuMind ID.",
            "similarity": 0.95,
        }
    ]

    mock_generate_answer.return_value = {
        "answer": "Nama proyeknya DocuMind ID.",
        "source_indices": [0],
    }

    mock_serialize.side_effect = lambda row: {**row, "sources": []}

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.post(
            f"/chat/conversations/{conversation_id}/messages",
            json={"content": "Jelaskan kembali hal tadi."},
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 201

    mock_generate_answer.assert_called_once()
    kwargs = mock_generate_answer.call_args.kwargs

    assert kwargs["question"] == "Jelaskan kembali hal tadi."
    assert len(kwargs["conversation_history"]) == 2
    assert kwargs["conversation_history"][0]["content"] == "Apa nama proyek ini?"
    assert kwargs["conversation_history"][1]["content"] == "Nama proyeknya DocuMind ID."


@patch("backend.app.api.chat.get_supabase_client")
def test_chat_rejects_conversation_not_owned_by_user(mock_get_supabase):
    user_id = uuid4()
    conversation_id = uuid4()

    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client

    # Tidak ada percakapan yang cocok dengan ID dan pemilik ini.
    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .limit.return_value
        .execute.return_value.data
    ) = []

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.get(
            f"/chat/conversations/{conversation_id}"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404
    assert response.json()["detail"] == "Conversation not found"


@patch("backend.app.api.chat.get_supabase_client")
def test_chat_does_not_fetch_messages_for_unowned_conversation(
    mock_get_supabase,
):
    user_id = uuid4()
    conversation_id = uuid4()

    mock_client = MagicMock()
    mock_get_supabase.return_value = mock_client

    (
        mock_client.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .limit.return_value
        .execute.return_value.data
    ) = []

    app.dependency_overrides[get_current_user] = lambda: {
        "sub": str(user_id),
        "role": "authenticated",
    }

    try:
        response = client.get(
            f"/chat/conversations/{conversation_id}"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 404

    # Pastikan query tabel messages tidak dijalankan.
    tables_requested = [
        call.args[0]
        for call in mock_client.table.call_args_list
    ]
    assert "messages" not in tables_requested
