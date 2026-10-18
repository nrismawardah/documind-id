
from unittest.mock import MagicMock, patch

import pytest

from backend.app.services.embedding_service import generate_embeddings


def test_empty_input_returns_empty_list():
    assert generate_embeddings([]) == []


def test_empty_text_is_rejected():
    with pytest.raises(ValueError, match="non-empty text"):
        generate_embeddings(["teks valid", " "])


@patch("backend.app.services.embedding_service._load_model")
def test_generate_embeddings_uses_passage_prefix(mock_load_model):
    model = MagicMock()
    mock_load_model.return_value = model

    # Fake vectors with shape (2, 768), without NumPy.
    model.encode.return_value = FakeVectors(rows=2, dimensions=768)

    result = generate_embeddings(["Dokumen pertama", "Dokumen kedua"])

    model.encode.assert_called_once_with(
        ["passage: Dokumen pertama", "passage: Dokumen kedua"],
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    assert len(result) == 2
    assert len(result[0]) == 768
    assert len(result[1]) == 768


@patch("backend.app.services.embedding_service._load_model")
def test_unexpected_embedding_dimensions_are_rejected(mock_load_model):
    model = MagicMock()
    mock_load_model.return_value = model
    model.encode.return_value = FakeVectors(rows=1, dimensions=384)

    with pytest.raises(ValueError, match="dimensions"):
        generate_embeddings(["Teks dokumen"])



class FakeVectors:
    """Minimal NumPy-like object for testing vector shape and conversion."""

    def __init__(self, rows, dimensions):
        self.ndim = 2
        self.shape = (rows, dimensions)
        self.rows = rows
        self.dimensions = dimensions

    def tolist(self):
        return [
            [0.1] * self.dimensions
            for _ in range(self.rows)
        ]