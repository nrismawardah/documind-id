
from io import BytesIO

from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> dict:
    """Extract PDF text while preserving page numbers."""
    try:
        reader = PdfReader(BytesIO(file_bytes))

        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported")

        pages = []

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""

            pages.append({
                "page_number": page_number,
                "text": text.strip(),
            })

        if not pages or not any(page["text"] for page in pages):
            raise ValueError(
                "PDF contains no extractable text; scanned PDFs are not supported"
            )

        return {
            "page_count": len(pages),
            "pages": pages,
        }

    except ValueError:
        raise
    except Exception:
        raise ValueError("Unable to read PDF file") from None
