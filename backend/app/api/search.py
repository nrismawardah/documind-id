from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.auth import get_current_user
from backend.app.services.semantic_search import search_document_chunks
from backend.app.services.gemini_service import generate_answer

router = APIRouter(prefix="/search", tags=["Semantic Search"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    match_count: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    document_id: UUID | None = None


class AskRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    match_count: int = Field(default=5, ge=1, le=10)
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


@router.post("/ask")
def ask_documents(
    request: AskRequest,
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

    if not results:
        return {
            "query": request.query.strip(),
            "answer": (
                "Informasi yang relevan tidak ditemukan "
                "dalam dokumen yang tersedia."
            ),
            "sources": [],
        }

    context_parts = []
    sources = []

    for result in results:
        filename = result.get("filename", "Dokumen tanpa nama")
        page_number = result.get("page_number")
        content = result.get("content", "").strip()

        if not content:
            continue

        context_parts.append(
            f"[Sumber: {filename}, halaman {page_number}]\n{content}"
        )

        sources.append({
            "document_id": str(result["document_id"]),
            "filename": filename,
            "page_number": page_number,
            "content": content,
            "similarity": result.get("similarity"),
        })

    if not context_parts:
        return {
            "query": request.query.strip(),
            "answer": (
                "Informasi yang relevan tidak ditemukan "
                "dalam dokumen yang tersedia."
            ),
            "sources": [],
        }

    try:
        answer = generate_answer(
            question=request.query.strip(),
            context="\n\n".join(context_parts),
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Answer generation is temporarily unavailable",
        ) from None

    return {
        "query": request.query.strip(),
        "answer": answer,
        "sources": sources,
    }
