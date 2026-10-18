
import logging
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client
from backend.app.services.document_access import get_owned_document
from backend.app.services.document_chunks import save_document_chunks
from backend.app.services.embedding_service import generate_embeddings
from backend.app.services.pdf_extractor import extract_pdf_text
from backend.app.services.text_chunker import chunk_pages

logger = logging.getLogger(__name__)


def process_document(document_id: UUID, user_id: UUID) -> dict:
    document = get_owned_document(
        document_id=document_id,
        user_id=user_id,
    )

    client = get_supabase_client()

    # Claim the document atomically to prevent duplicate processing.
    try:
        response = (
            client.table("documents")
            .update({
                "status": "processing",
                "error_message": None,
            })
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .in_("status", ["uploaded", "failed"])
            .execute()
        )
    except Exception:
        logger.exception("Failed to start document processing")
        raise HTTPException(
            status_code=503,
            detail="Unable to start document processing",
        ) from None

    if not response.data:
        raise HTTPException(
            status_code=409,
            detail="Document is already processing or cannot be processed",
        )

    try:
        file_response = client.storage.from_("documents").download(
            document["storage_path"]
        )

        extracted = extract_pdf_text(file_response)
        chunks = chunk_pages(extracted["pages"])

        embeddings = generate_embeddings(
            [chunk["content"] for chunk in chunks]
        )

        for chunk, embedding in zip(chunks, embeddings, strict=True):
            chunk["embedding"] = embedding

        saved_count = save_document_chunks(
            document_id=document_id,
            user_id=user_id,
            chunks=chunks,
        )

        # Only mark the document ready if it is still being processed.
        response = (
            client.table("documents")
            .update({
                "page_count": extracted["page_count"],
                "status": "ready",
                "error_message": None,
            })
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .eq("status", "processing")
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=409,
                detail="Document state changed during processing",
            )

        return {
            "document_id": str(document_id),
            "page_count": extracted["page_count"],
            "chunk_count": saved_count,
            "status": "ready",
            "pages": extracted["pages"],
        }

    except HTTPException as exc:
        if exc.status_code < 500:
            raise

        logger.exception("Document processing failed")

    except Exception:
        logger.exception("Document processing failed")

    # Do not overwrite a document that another operation is deleting.
    try:
        (
            client.table("documents")
            .update({
                "status": "failed",
                "error_message": "Document processing failed",
            })
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .eq("status", "processing")
            .execute()
        )
    except Exception:
        logger.exception("Failed to update document failure status")

    raise HTTPException(
        status_code=503,
        detail="Unable to process document",
    ) from None
