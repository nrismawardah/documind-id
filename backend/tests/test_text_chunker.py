
import pytest

from backend.app.services.text_chunker import chunk_pages


def test_chunk_pages_returns_single_chunk_for_short_text():
    pages = [
        {"page_number": 1, "text": "Ini contoh teks PDF."}
    ]

    result = chunk_pages(pages, chunk_size=100, overlap=10)

    assert len(result) == 1
    assert result[0] == {
        "chunk_index": 0,
        "page_number": 1,
        "content": "Ini contoh teks PDF.",
    }


def test_chunk_pages_splits_long_text_with_overlap():
    pages = [
        {"page_number": 1, "text": "ABCDEFGHIJ"}
    ]

    result = chunk_pages(pages, chunk_size=6, overlap=2)

    assert [chunk["content"] for chunk in result] == [
        "ABCDEF",
        "EFGHIJ",
    ]
    assert [chunk["chunk_index"] for chunk in result] == [0, 1]


def test_chunk_pages_preserves_page_numbers():
    pages = [
        {"page_number": 1, "text": "Teks halaman pertama."},
        {"page_number": 2, "text": "Teks halaman kedua."},
    ]

    result = chunk_pages(pages, chunk_size=100, overlap=10)

    assert [chunk["page_number"] for chunk in result] == [1, 2]


def test_chunk_pages_skips_empty_pages():
    pages = [
        {"page_number": 1, "text": "   "},
        {"page_number": 2, "text": "Teks halaman kedua."},
    ]

    result = chunk_pages(pages)

    assert len(result) == 1
    assert result[0]["page_number"] == 2


@pytest.mark.parametrize(
    ("chunk_size", "overlap"),
    [
        (0, 0),
        (-1, 0),
        (10, -1),
        (10, 10),
        (10, 11),
    ],
)
def test_chunk_pages_rejects_invalid_parameters(chunk_size, overlap):
    with pytest.raises(ValueError):
        chunk_pages(
            [{"page_number": 1, "text": "Contoh teks"}],
            chunk_size=chunk_size,
            overlap=overlap,
        )
