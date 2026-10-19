
from io import BytesIO

import pymupdf
import pytesseract
from PIL import Image
from pypdf import PdfReader


# Lokasi Tesseract di Windows.
# Tetapkan secara eksplisit agar aplikasi tidak bergantung pada PATH.
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_pdf_text(file_bytes: bytes) -> dict:
    try:
        reader = PdfReader(BytesIO(file_bytes))

        if reader.is_encrypted:
            raise ValueError("Encrypted PDFs are not supported")

        # Buka PDF menggunakan PyMuPDF untuk mendukung rendering halaman.
        pdf = pymupdf.open(stream=file_bytes, filetype="pdf")

        if pdf.needs_pass:
            raise ValueError("Encrypted PDFs are not supported")

        pages = []

        try:
            for page_number, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()

                # Jika teks tidak tersedia atau sangat sedikit,
                # render halaman dan jalankan OCR.
                if len(text) < 30:
                    pdf_page = pdf.load_page(page_number - 1)
                    pixmap = pdf_page.get_pixmap(
                        matrix=pymupdf.Matrix(2, 2),
                        alpha=False,
                    )

                    image = Image.open(
                        BytesIO(pixmap.tobytes("png"))
                    )

                    ocr_text = pytesseract.image_to_string(
                        image,
                        lang="ind+eng",
                        config="--psm 3",
                    ).strip()

                    # Gunakan hasil OCR jika lebih informatif.
                    if len(ocr_text) > len(text):
                        text = ocr_text

                pages.append(
                    {
                        "page_number": page_number,
                        "text": text,
                    }
                )
        finally:
            pdf.close()

        if not pages or not any(page["text"].strip() for page in pages):
            raise ValueError(
                "PDF contains no extractable text, including OCR; "
                "the document may be blank or unreadable"
            )

        return {
            "page_count": len(pages),
            "pages": pages,
        }

    except ValueError:
        raise
    except Exception:
        raise ValueError("Unable to read PDF file") from None
