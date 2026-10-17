
from uuid import UUID

from fastapi import HTTPException

from backend.app.core.supabase import get_supabase_client


def save_document_chunks(
    document_id: UUID,
    user_id: UUID,
    chunks: list[dict],
) -> int:
    """Atomically replace a document's chunks through Supabase RPC."""
    client = get_supabase_client()

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

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Unable to save document chunks",
        ) from None
