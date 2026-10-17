
from io import BytesIO

from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> dict:
    """Extract text from a PDF and preserve its page numbers."""
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

        return {
            "page_count": len(pages),
            "pages": pages,
        }

    except ValueError:
        raise
    except Exception:
        raise ValueError("Unable to read PDF file") from None
