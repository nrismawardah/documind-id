
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.core.auth import get_current_user
from backend.app.services.semantic_search import search_document_chunks
from backend.app.services.gemini_service import (
    NOT_FOUND_MARKER,
    generate_answer_with_sources,
)

router = APIRouter(prefix="/search", tags=["Semantic Search"])

FALLBACK_ANSWER = (
    "Informasi yang relevan untuk menjawab pertanyaan "
    "tidak ditemukan dalam konteks dokumen yang tersedia."
)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    match_count: int = Field(default=5, ge=1, le=20)
    match_threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    document_id: UUID | None = None


class AskRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    # Ambil lebih banyak kandidat untuk meningkatkan peluang menemukan
    # bagian lanjutan dari daftar atau tabel.
    match_count: int = Field(default=20, ge=1, le=20)
    match_threshold: float = Field(default=0.0, ge=0.0, le=1.0)
    document_id: UUID | None = None


def _get_user_id(claims: dict) -> UUID:
    try:
        return UUID(claims["sub"])
    except (KeyError, ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        ) from None


def _prepare_candidates(results: list[dict]) -> tuple[str, list[dict]]:
    """Siapkan konteks dan metadata kandidat berdasarkan hasil retrieval."""
    context_parts: list[str] = []
    candidates: list[dict] = []

    for result in results:
        content = result.get("content")
        if not isinstance(content, str) or not content.strip():
            continue

        filename = result.get("filename") or "Dokumen tanpa nama"
        page_number = result.get("page_number")

        # Indeks hanya diberikan oleh aplikasi. Gemini tidak menentukan
        # sendiri document_id, filename, atau nomor halaman.
        index = len(candidates)
        context_parts.append(
            f"[SOURCE {index}]\n"
            f"Nama dokumen: {filename}\n"
            f"Halaman: {page_number}\n"
            f"Isi:\n{content.strip()}"
        )

        candidates.append(
            {
                "document_id": str(result["document_id"]),
                "filename": filename,
                "page_number": page_number,
                "content": content.strip(),
                "similarity": result.get("similarity"),
            }
        )

    return "\n\n".join(context_parts), candidates


@router.post("")
def search_documents(
    request: SearchRequest,
    claims: dict = Depends(get_current_user),
):
    user_id = _get_user_id(claims)

    results = search_document_chunks(
        user_id=user_id,
        query=request.query.strip(),
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
    user_id = _get_user_id(claims)

    results = search_document_chunks(
        user_id=user_id,
        query=request.query.strip(),
        match_count=request.match_count,
        match_threshold=request.match_threshold,
        document_id=request.document_id,
    )

    context, candidates = _prepare_candidates(results)

    if not candidates:
        return {
            "query": request.query.strip(),
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    try:
        generated = generate_answer_with_sources(
            question=request.query.strip(),
            context=context,
            candidate_count=len(candidates),
        )
    except Exception:
        logging.exception("Answer generation failed")
        raise HTTPException(
            status_code=503,
            detail="Answer generation is temporarily unavailable",
        ) from None

    answer = generated["answer"]
    indices = generated["source_indices"]

    if answer == NOT_FOUND_MARKER or not indices:
        return {
            "query": request.query.strip(),
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    # Ambil hanya sumber terpilih. Indeks divalidasi kembali di lapisan API.
    selected_sources = [
        candidates[index]
        for index in indices
        if isinstance(index, int)
        and not isinstance(index, bool)
        and 0 <= index < len(candidates)
    ]

    if not selected_sources:
        return {
            "query": request.query.strip(),
            "answer": FALLBACK_ANSWER,
            "sources": [],
        }

    return {
        "query": request.query.strip(),
        "answer": answer,
        "sources": selected_sources,
    }
