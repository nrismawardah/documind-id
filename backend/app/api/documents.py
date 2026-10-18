
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.app.core.auth import get_current_user
from backend.app.services.document_access import get_owned_document
from backend.app.services.document_access import (
    get_owned_document,
    get_user_documents,
)
from backend.app.services.document_upload import store_document_pdf
from backend.app.services.document_processing import process_document

router = APIRouter(prefix="/documents", tags=["Documents"])


MAX_PDF_SIZE = 10 * 1024 * 1024


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    claims: dict = Depends(get_current_user),
):
    filename = file.filename or ""

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are allowed",
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Content-Type must be application/pdf",
        )

    content = await file.read(MAX_PDF_SIZE + 1)

    if len(content) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF exceeds the 10 MB size limit",
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File content is not a valid PDF signature",
        )

    try:
        user_id = UUID(claims["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authenticated user",
        ) from None

    return store_document_pdf(
        user_id=user_id,
        filename=filename,
        file_bytes=content,
    )

@router.get("")
def list_documents(
    claims: dict = Depends(get_current_user),
):
    user_id = UUID(claims["sub"])

    return get_user_documents(user_id=user_id)

@router.get("/{document_id}")
def read_document(
    document_id: UUID,
    claims: dict = Depends(get_current_user),
):
    user_id = UUID(claims["sub"])

    return get_owned_document(
        document_id=document_id,
        user_id=user_id,
    )

@router.post("/{document_id}/process")
def process_document_endpoint(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return process_document(
        document_id=document_id,
        user_id=UUID(current_user["sub"]),
    )
@router.delete("/{document_id}")
def delete_document_endpoint(
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    from backend.app.services.document_deletion import delete_document

    return delete_document(
        document_id=document_id,
        user_id=UUID(current_user["sub"]),
    )
