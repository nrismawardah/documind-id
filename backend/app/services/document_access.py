
import logging
from uuid import UUID

from fastapi import HTTPException, status

from backend.app.core.supabase import get_supabase_client


logger = logging.getLogger(__name__)


def get_owned_document(document_id: UUID, user_id: UUID) -> dict:
    """Return a document only when it belongs to the authenticated user."""
    try:
        response = (
            get_supabase_client()
            .table("documents")
            .select("*")
            .eq("id", str(document_id))
            .eq("user_id", str(user_id))
            .maybe_single()
            .execute()
        )

        document = response.data if response is not None else None

    except Exception:
        logger.exception("Failed to verify document access")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify document access",
        ) from None

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


def get_user_documents(user_id: UUID) -> list[dict]:
    """Return documents belonging only to the specified user."""
    try:
        response = (
            get_supabase_client()
            .table("documents")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )

        return response.data or []

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve documents",
        ) from None
