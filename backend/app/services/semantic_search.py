
import logging
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client
from backend.app.services.embedding_service import generate_query_embedding

logger = logging.getLogger(__name__)


def search_document_chunks(
    *,
    user_id: UUID,
    query: str,
    match_count: int = 5,
    match_threshold: float = 0.0,
    document_id: UUID | None = None,
) -> list[dict]:
    query = query.strip()

    if not query:
        raise HTTPException(
            status_code=422,
            detail="Search query must not be empty",
        )

    if len(query) > 2000:
        raise HTTPException(
            status_code=422,
            detail="Search query must not exceed 2000 characters",
        )

    if not 1 <= match_count <= 20:
        raise HTTPException(
            status_code=422,
            detail="match_count must be between 1 and 20",
        )

    if not 0.0 <= match_threshold <= 1.0:
        raise HTTPException(
            status_code=422,
            detail="match_threshold must be between 0 and 1",
        )

    try:
        embedding = generate_query_embedding(query)

        response = get_supabase_client().rpc(
            "match_document_chunks",
            {
                "p_user_id": str(user_id),
                "p_query": query,
                "p_query_embedding": embedding,
                "p_match_count": match_count,
                "p_match_threshold": match_threshold,
                "p_document_id": (
                    str(document_id) if document_id else None
                ),
            },
        ).execute()

        return response.data or []

    except HTTPException:
        raise
    except Exception:
        logger.exception("Semantic search failed")
        raise HTTPException(
            status_code=503,
            detail="Semantic search is temporarily unavailable",
        ) from None
