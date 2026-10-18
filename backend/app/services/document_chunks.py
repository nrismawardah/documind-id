
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client

import logging

logger = logging.getLogger(__name__)

def save_document_chunks(
    document_id: UUID,
    user_id: UUID,
    chunks: list[dict],
) -> int:
    """Atomically replace document chunks and their embeddings."""
    client = get_supabase_client()

    for chunk in chunks:
        embedding = chunk.get("embedding")

        if (
            not isinstance(embedding, list)
            or len(embedding) != 768
            or any(
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                for value in embedding
            )
        ):
            raise HTTPException(
                status_code=422,
                detail="Invalid chunk embedding",
            )

    try:
        response = client.rpc(
            "replace_document_chunks",
            {
                "p_document_id": str(document_id),
                "p_user_id": str(user_id),
                "p_chunks": chunks,
            },
        ).execute()

        return int(response.data)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to save document chunks")
        raise HTTPException(
            status_code=503,
            detail="Unable to save document chunks",
        ) from None
