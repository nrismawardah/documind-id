
import logging
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client
from backend.app.services.document_access import get_owned_document
from backend.app.services.document_chunks import save_document_chunks
from backend.app.services.pdf_extractor import extract_pdf_text
from backend.app.services.text_chunker import chunk_pages

logger = logging.getLogger(__name__)


def process_document(document_id: UUID, user_id: UUID) -> dict:
    document = get_owned_document(
        document_id=document_id,
        user_id=user_id,
    )

    client = get_supabase_client()

    try:
        # 1. Download PDF from private Supabase Storage.
        file_response = (
            client.storage
            .from_("documents")
            .download(document["storage_path"])
        )

        # 2. Extract text while preserving page numbers.
        extracted = extract_pdf_text(file_response)

        # 3. Split extracted text into overlapping chunks.
        chunks = chunk_pages(extracted["pages"])

        # 4. Atomically replace chunks in the database.
        saved_count = save_document_chunks(
            document_id=document_id,
            user_id=user_id,
            chunks=chunks,
        )

        # 5. Mark the document ready only after chunks are saved.
        response = (
            client.table("documents")
            .update({
                "page_count": extracted["page_count"],
                "status": "ready",
                "error_message": None,
            })
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .execute()
        )

        if not response.data:
            raise RuntimeError("Document metadata was not updated")

        return {
            "document_id": str(document_id),
            "page_count": extracted["page_count"],
            "chunk_count": saved_count,
            "status": "ready",
            "pages": extracted["pages"],
        }

    except HTTPException as exc:
        logger.warning(
            "Document processing returned HTTP %s for document %s",
            exc.status_code,
            document_id,
        )

        if exc.status_code < 500:
            raise

        logger.exception(
            "Document processing failed for document %s",
            document_id,
        )

        try:
            (
                client.table("documents")
                .update({
                    "status": "failed",
                    "error_message": "Document processing failed",
                })
                .eq("id", str(document_id))
                .eq("user_id", str(user_id))
                .execute()
            )
        except Exception:
            logger.exception(
                "Failed to update document status for %s",
                document_id,
            )

        raise HTTPException(
            status_code=503,
            detail="Unable to process document",
        ) from None

    except Exception:
        logger.exception(
            "Document processing failed for document %s",
            document_id,
        )

        try:
            (
                client.table("documents")
                .update({
                    "status": "failed",
                    "error_message": "Document processing failed",
                })
                .eq("id", str(document_id))
                .eq("user_id", str(user_id))
                .execute()
            )
        except Exception:
            logger.exception(
                "Failed to update document status for %s",
                document_id,
            )

        raise HTTPException(
            status_code=503,
            detail="Unable to process document",
        ) from None
