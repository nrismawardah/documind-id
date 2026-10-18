
import logging
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client
from backend.app.services.document_access import get_owned_document

logger = logging.getLogger(__name__)

BUCKET_NAME = "documents"

DELETABLE_STATUSES = [
    "uploaded",
    "processing",
    "ready",
    "failed",
    "deleting",
]


def delete_document(document_id: UUID, user_id: UUID) -> dict:
    document = get_owned_document(
        document_id=document_id,
        user_id=user_id,
    )

    client = get_supabase_client()

    # Mark the document as deleting before removing its file.
    # Allow retries when a previous deletion attempt was incomplete.
    try:
        response = (
            client.table("documents")
            .update({
                "status": "deleting",
                "error_message": None,
            })
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .in_("status", DELETABLE_STATUSES)
            .execute()
        )
    except Exception:
        logger.exception("Failed to mark document for deletion")
        raise HTTPException(
            status_code=503,
            detail="Unable to start document deletion",
        ) from None

    if not response.data:
        raise HTTPException(
            status_code=409,
            detail="Document cannot be deleted in its current state",
        )

    # If storage removal fails, retain the metadata in deleting state.
    # A subsequent DELETE request can retry the operation.
    try:
        client.storage.from_(BUCKET_NAME).remove(
            [document["storage_path"]]
        )
    except Exception:
        logger.exception("Failed to delete document file")
        raise HTTPException(
            status_code=503,
            detail="Unable to delete document file. Please retry deletion.",
        ) from None

    # If metadata deletion fails, a subsequent request can retry both steps.
    try:
        response = (
            client.table("documents")
            .delete()
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .eq("status", "deleting")
            .execute()
        )

        if not response.data:
            raise RuntimeError("Document metadata was not deleted")

    except Exception:
        logger.exception("Failed to delete document metadata")
        raise HTTPException(
            status_code=503,
            detail=(
                "The document file was deleted, but its metadata remains. "
                "Please retry deletion."
            ),
        ) from None

    return {
        "message": "Document deleted successfully",
        "document_id": str(document_id),
    }
