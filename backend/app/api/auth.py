
from fastapi import APIRouter, Depends

from backend.app.core.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me")
def read_current_user(
    claims: dict = Depends(get_current_user),
):
    return {
        "id": claims["sub"],
        "role": claims.get("role"),
    }
