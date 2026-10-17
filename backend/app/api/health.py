
from fastapi import APIRouter, HTTPException

from backend.app.core.supabase import get_supabase_client

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/supabase")
def check_supabase():
    try:
        client = get_supabase_client()
        client.table("documents").select("id").limit(1).execute()

        return {
            "status": "healthy",
            "service": "supabase",
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Supabase connection check failed",
        )
