
from unittest.mock import MagicMock, patch

import pytest

from backend.app.services.gemini_service import generate_answer


@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_returns_gemini_response(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = "Dokumen menyebutkan tiga faktor utama."
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-3.8-flash"

        answer = generate_answer(
            question="Apa faktor utamanya?",
            context="Faktor utama adalah A, B, dan C.",
        )

    assert answer == "Dokumen menyebutkan tiga faktor utama."
    mock_client.models.generate_content.assert_called_once()


@patch("backend.app.services.gemini_service.genai.Client")
def test_generate_answer_raises_when_response_is_empty(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client

    mock_response = MagicMock()
    mock_response.text = None
    mock_client.models.generate_content.return_value = mock_response

    with patch(
        "backend.app.services.gemini_service.get_settings"
    ) as mock_get_settings:
        mock_get_settings.return_value.gemini_api_key = "test-api-key"
        mock_get_settings.return_value.gemini_model_name = "gemini-3.8-flash"

        with pytest.raises(RuntimeError, match="Gemini tidak menghasilkan jawaban"):
            generate_answer(
                question="Apa faktor utamanya?",
                context="Konteks pengujian.",
            )
