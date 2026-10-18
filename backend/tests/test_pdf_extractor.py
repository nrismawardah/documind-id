
from io import BytesIO

import pytest
from pypdf import PdfWriter
from reportlab.pdfgen import canvas

from backend.app.services.pdf_extractor import extract_pdf_text


def create_test_pdf(page_texts: list[str]) -> bytes:
    """Create a PDF containing real text on each page."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(300, 300))

    for text in page_texts:
        pdf.drawString(30, 250, text)
        pdf.showPage()

    pdf.save()
    return buffer.getvalue()


def test_extract_pdf_text_returns_page_count():
    pdf_bytes = create_test_pdf(["Halaman pertama", "Halaman kedua"])

    result = extract_pdf_text(pdf_bytes)

    assert result["page_count"] == 2
    assert len(result["pages"]) == 2


def test_extract_pdf_text_preserves_page_numbers():
    pdf_bytes = create_test_pdf(["Halaman pertama", "Halaman kedua"])

    result = extract_pdf_text(pdf_bytes)

    assert result["pages"][0]["page_number"] == 1
    assert result["pages"][1]["page_number"] == 2


def test_extract_pdf_text_rejects_invalid_pdf():
    with pytest.raises(ValueError, match="Unable to read PDF file"):
        extract_pdf_text(b"this is not a PDF")


def test_extract_pdf_text_rejects_encrypted_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    writer.encrypt("test-password")

    buffer = BytesIO()
    writer.write(buffer)

    with pytest.raises(
        ValueError, match="Encrypted PDFs are not supported"
    ):
        extract_pdf_text(buffer.getvalue())


def test_extract_pdf_text_extracts_real_text():
    pdf_bytes = create_test_pdf(["DocuMind ID PDF extraction test"])

    result = extract_pdf_text(pdf_bytes)

    assert result["page_count"] == 1
    assert result["pages"][0]["page_number"] == 1
    assert (
        "DocuMind ID PDF extraction test"
        in result["pages"][0]["text"]
    )


def test_extract_pdf_text_rejects_pdf_without_extractable_text():
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)

    buffer = BytesIO()
    writer.write(buffer)

    with pytest.raises(
        ValueError,
        match="PDF contains no extractable text",
    ):
        extract_pdf_text(buffer.getvalue())
