from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.auth import get_current_user
from backend.app.services.semantic_search import search_document_chunks

router = APIRouter(prefix="/search", tags=["Semantic Search"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    match_count: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    document_id: UUID | None = None


@router.post("")
def search_documents(
    request: SearchRequest,
    claims: dict = Depends(get_current_user),
):
    try:
        user_id = UUID(claims["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authenticated user",
        ) from None

    results = search_document_chunks(
        user_id=user_id,
        query=request.query,
        match_count=request.match_count,
        match_threshold=request.match_threshold,
        document_id=request.document_id,
    )

    return {
        "query": request.query.strip(),
        "total_results": len(results),
        "results": results,
    }