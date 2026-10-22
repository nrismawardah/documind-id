import logging
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from backend.app.core.auth import get_current_user
from backend.app.core.supabase import get_supabase_client
from backend.app.services.document_access import get_owned_document
from backend.app.services.semantic_search import search_document_chunks
from backend.app.services.gemini_service import NOT_FOUND_MARKER, generate_answer_with_sources

router = APIRouter(prefix="/chat", tags=["Chat History"])
FALLBACK_ANSWER = "Informasi yang relevan untuk menjawab pertanyaan tidak ditemukan dalam konteks dokumen yang tersedia."

class ConversationCreate(BaseModel):
    document_id: UUID
    title: str | None = Field(default=None, max_length=120)

class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

def user_uuid(claims: dict) -> UUID:
    try: return UUID(claims["sub"])
    except (KeyError, ValueError, TypeError): raise HTTPException(status_code=401, detail="Invalid authentication credentials") from None

def owned_conversation(conversation_id: UUID, user_id: UUID) -> dict:
    client = get_supabase_client()
    response = client.table("conversations").select("*").eq("id", str(conversation_id)).eq("user_id", str(user_id)).limit(1).execute()
    if not response.data: raise HTTPException(status_code=404, detail="Conversation not found")
    return response.data[0]

def message_sources(message_id: str) -> list[dict]:
    response = get_supabase_client().table("message_sources").select("chunk_id,document_id,page_number,quote_text").eq("message_id", message_id).order("page_number").execute()
    return response.data or []

def serialize_message(row: dict) -> dict:
    return {**row, "sources": message_sources(row["id"]) if row["role"] == "assistant" else []}

@router.get("/conversations")
def list_user_conversations(document_id: UUID, claims: dict = Depends(get_current_user)):
    user_id = user_uuid(claims)
    get_owned_document(document_id=document_id, user_id=user_id)
    response = get_supabase_client().table("conversations").select("*").eq("user_id", str(user_id)).eq("document_id", str(document_id)).order("updated_at", desc=True).execute()
    return response.data or []

@router.post("/conversations", status_code=201)
def create_user_conversation(payload: ConversationCreate, claims: dict = Depends(get_current_user)):
    user_id = user_uuid(claims)
    document = get_owned_document(document_id=payload.document_id, user_id=user_id)
    title = (payload.title or "Percakapan baru").strip()[:120] or "Percakapan baru"
    response = get_supabase_client().table("conversations").insert({"user_id": str(user_id), "document_id": str(payload.document_id), "title": title}).execute()
    if not response.data: raise HTTPException(status_code=503, detail="Gagal membuat percakapan")
    return response.data[0]

@router.get("/conversations/{conversation_id}")
def get_user_conversation(conversation_id: UUID, claims: dict = Depends(get_current_user)):
    conversation = owned_conversation(conversation_id, user_uuid(claims))
    rows = get_supabase_client().table("messages").select("*").eq("conversation_id", str(conversation_id)).order("created_at").execute()
    return {**conversation, "messages": [serialize_message(row) for row in (rows.data or [])]}

@router.post("/conversations/{conversation_id}/messages", status_code=201)
def create_chat_message(conversation_id: UUID, payload: MessageCreate, claims: dict = Depends(get_current_user)):
    user_id = user_uuid(claims)
    conversation = owned_conversation(conversation_id, user_id)
    question = payload.content.strip()
    if not question: raise HTTPException(status_code=422, detail="Pertanyaan tidak boleh kosong")
    client = get_supabase_client()
    try:
        user_insert = client.table("messages").insert({"conversation_id": str(conversation_id), "role": "user", "content": question}).execute()
        if not user_insert.data: raise RuntimeError("Pesan pengguna gagal disimpan")
        user_message = user_insert.data[0]
        history_response = (
            client.table("messages")
            .select("id, role, content")
            .eq("conversation_id", str(conversation_id))
            .order("created_at")
            .execute()
        )

        conversation_history = [
            row
            for row in (history_response.data or [])
            if row["id"] != user_message["id"]
        ][-10:]
        
        candidates = search_document_chunks(user_id=user_id, query=question, match_count=20, match_threshold=0.0, document_id=UUID(conversation["document_id"]))
        context_parts, valid_candidates = [], []
        for item in candidates:
            content = item.get("content")
            if not isinstance(content, str) or not content.strip(): continue
            index = len(valid_candidates)
            context_parts.append(f"[SOURCE {index}]\nNama dokumen: {item.get('filename') or 'Dokumen tanpa nama'}\nHalaman: {item.get('page_number')}\nIsi:\n{content.strip()}")
            valid_candidates.append({"chunk_id": item.get("chunk_id"), "document_id": str(item["document_id"]), "filename": item.get("filename") or "Dokumen tanpa nama", "page_number": item.get("page_number"), "content": content.strip(), "similarity": item.get("similarity")})
        answer, chosen = FALLBACK_ANSWER, []
        if valid_candidates:
            generated = generate_answer_with_sources(
                question=question,
                context="\n\n".join(context_parts),
                candidate_count=len(valid_candidates),
                conversation_history=conversation_history,
            )
            if generated["answer"] != NOT_FOUND_MARKER:
                answer = generated["answer"]
                chosen = [valid_candidates[i] for i in generated["source_indices"] if isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(valid_candidates)]
                if not chosen: answer = FALLBACK_ANSWER
        assistant_insert = client.table("messages").insert({"conversation_id": str(conversation_id), "role": "assistant", "content": answer}).execute()
        if not assistant_insert.data: raise RuntimeError("Jawaban AI gagal disimpan")
        assistant_message = assistant_insert.data[0]
        if chosen:
            source_rows = []
            for item in chosen:
                if not item.get("chunk_id") or not item.get("page_number"): continue
                source_rows.append({"message_id": assistant_message["id"], "conversation_id": str(conversation_id), "chunk_id": item["chunk_id"], "document_id": item["document_id"], "page_number": int(item["page_number"]), "quote_text": item["content"]})
            if source_rows: client.table("message_sources").insert(source_rows).execute()
        client.table("conversations").update({"updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(conversation_id)).eq("user_id", str(user_id)).execute()
        return {"user_message": serialize_message(user_message), "assistant_message": serialize_message(assistant_message)}
    except HTTPException: raise
    except Exception:
        logging.exception("Chat message processing failed")
        raise HTTPException(status_code=503, detail="Pesan gagal diproses. Coba lagi sebentar.") from None
