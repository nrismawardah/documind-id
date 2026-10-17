
from uuid import UUID, uuid4
from pathlib import PurePosixPath

from fastapi import HTTPException, status

from backend.app.core.supabase import get_supabase_client


BUCKET_NAME = "documents"


def store_document_pdf(
    user_id: UUID,
    filename: str,
    file_bytes: bytes,
) -> dict:
    """Upload a PDF to private Storage and record its metadata."""
    client = get_supabase_client()

    # Generate a unique storage path; never trust a client-supplied path.
    safe_filename = PurePosixPath(filename.replace("\\", "/")).name
    storage_path = f"{user_id}/{uuid4()}.pdf"

    try:
        client.storage.from_(BUCKET_NAME).upload(
            storage_path,
            file_bytes,
            {
                "content-type": "application/pdf",
                "upsert": "false",
            },
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to upload PDF",
        ) from None

    try:
        response = (
            client.table("documents")
            .insert(
                {
                    "user_id": str(user_id),
                    "filename": safe_filename,
                    "storage_path": storage_path,
                    "file_size_bytes": len(file_bytes),
                    "status": "uploaded",
                }
            )
            .execute()
        )

        if not response.data:
            raise RuntimeError("Document metadata was not returned")

        return response.data[0]

    except Exception:
        # Best-effort rollback if metadata insertion fails.
        try:
            client.storage.from_(BUCKET_NAME).remove([storage_path])
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save document metadata",
        ) from None
