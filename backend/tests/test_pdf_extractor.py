
from io import BytesIO

import pytest
from pypdf import PdfWriter

from backend.app.services.pdf_extractor import extract_pdf_text

from reportlab.pdfgen import canvas


def create_test_pdf(page_texts: list[str]) -> bytes:
    writer = PdfWriter()

    for text in page_texts:
        page = writer.add_blank_page(width=300, height=300)
        page.extract_text = lambda: text

    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_extract_pdf_text_returns_page_count():
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    writer.add_blank_page(width=300, height=300)

    buffer = BytesIO()
    writer.write(buffer)

    result = extract_pdf_text(buffer.getvalue())

    assert result["page_count"] == 2
    assert len(result["pages"]) == 2


def test_extract_pdf_text_preserves_page_numbers():
    writer = PdfWriter()
    writer.add_blank_page(width=300, height=300)
    writer.add_blank_page(width=300, height=300)

    buffer = BytesIO()
    writer.write(buffer)

    result = extract_pdf_text(buffer.getvalue())

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

    with pytest.raises(ValueError, match="Encrypted PDFs are not supported"):
        extract_pdf_text(buffer.getvalue())


def test_extract_pdf_text_extracts_real_text():
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(50, 750, "DocuMind ID PDF extraction test")
    pdf.showPage()
    pdf.save()

    result = extract_pdf_text(buffer.getvalue())

    assert result["page_count"] == 1
    assert result["pages"][0]["page_number"] == 1
    assert "DocuMind ID PDF extraction test" in result["pages"][0]["text"]
