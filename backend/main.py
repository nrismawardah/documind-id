
from fastapi import FastAPI

from backend.app.api.health import router as health_router
from backend.app.api.auth import router as auth_router
from backend.app.api.documents import router as documents_router
from backend.app.api.search import router as search_router

app = FastAPI(
    title="DocuMind ID API",
    description="Backend API for asking questions about Indonesian PDF documents.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(search_router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to DocuMind ID API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "documind-id-api",
    }
