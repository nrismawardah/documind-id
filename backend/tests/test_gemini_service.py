
import json
from unittest.mock import MagicMock, patch

import pytest
from google.genai import errors

from backend.app.services import gemini_service


@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_returns_gemini_response(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "answer": "Dokumen menyebutkan tiga faktor utama.",
            "source_indices": [0],
        }
    )
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-test"

        answer = gemini_service.generate_answer(
            question="Apa faktor utamanya?",
            context="[SOURCE 0]\nFaktor utama adalah A, B, dan C.",
        )

    assert answer == "Dokumen menyebutkan tiga faktor utama."
    mock_client.models.generate_content.assert_called_once()


@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_returns_not_found_when_json_is_invalid(
    mock_client_class,
):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = "Ini bukan JSON"
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-test"

        answer = gemini_service.generate_answer(
            question="Apa jawabannya?",
            context="[SOURCE 0]\nKonteks pengujian.",
        )

    assert answer == gemini_service.NOT_FOUND_MARKER


@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_handles_empty_response(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = None
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-test"

        with pytest.raises(
            RuntimeError,
            match="Gemini tidak menghasilkan jawaban",
        ):
            gemini_service.generate_answer(
                question="Apa faktor utamanya?",
                context="[SOURCE 0]\nKonteks pengujian.",
            )


@patch("backend.app.services.gemini_service.time.sleep")
@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_retries_after_temporary_server_error(
    mock_client_class,
    mock_sleep,
):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "answer": "Jawaban dari dokumen.",
            "source_indices": [0],
        }
    )

    mock_client.models.generate_content.side_effect = [
        errors.ServerError(
            503,
            {"error": {"message": "Temporary unavailable"}},
        ),
        mock_response,
    ]

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-test"

        answer = gemini_service.generate_answer(
            question="Apa isi dokumen?",
            context="[SOURCE 0]\nDokumen pengujian.",
        )

    assert answer == "Jawaban dari dokumen."
    assert mock_client.models.generate_content.call_count == 2
    mock_sleep.assert_called_once_with(2)


def test_generate_answer_with_sources_filters_invalid_indices():
    raw_response = json.dumps(
        {
            "answer": "Jawaban berdasarkan sumber kedua.",
            "source_indices": [1, 99, -1, "0", True, 1],
        }
    )

    with patch(
        "backend.app.services.gemini_service._generate_content",
        return_value=raw_response,
    ):
        result = gemini_service.generate_answer_with_sources(
            question="Apa jawabannya?",
            context=(
                "[SOURCE 0]\nSumber pertama\n"
                "[SOURCE 1]\nSumber kedua"
            ),
            candidate_count=2,
        )

    assert result["answer"] == "Jawaban berdasarkan sumber kedua."
    assert result["source_indices"] == [1]


def test_generate_answer_with_sources_returns_not_found_without_sources():
    raw_response = json.dumps(
        {
            "answer": "Jawaban tanpa bukti.",
            "source_indices": [],
        }
    )

    with patch(
        "backend.app.services.gemini_service._generate_content",
        return_value=raw_response,
    ):
        result = gemini_service.generate_answer_with_sources(
            question="Apa jawabannya?",
            context="[SOURCE 0]\nKonteks pengujian.",
            candidate_count=1,
        )

    assert result["answer"] == gemini_service.NOT_FOUND_MARKER
    assert result["source_indices"] == []
