
from fastapi import FastAPI

app = FastAPI(
    title="DocuMind ID API",
    description="Backend API for asking questions about Indonesian PDF documents.",
    version="0.1.0",
)


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
