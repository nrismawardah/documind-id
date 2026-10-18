
from functools import lru_cache

from backend.app.core.config import get_settings


@lru_cache(maxsize=1)
def _load_model():
    """Load the embedding model once per backend process."""
    from sentence_transformers import SentenceTransformer

    settings = get_settings()

    return SentenceTransformer(
        settings.embedding_model_name,
        device="cpu",
    )


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate normalized 768-dimensional embeddings for document chunks."""
    if not texts:
        return []

    if any(not isinstance(text, str) or not text.strip() for text in texts):
        raise ValueError("Embedding input must contain non-empty text")

    model = _load_model()

    # E5 models use the passage prefix for document content.
    passages = [f"passage: {text}" for text in texts]

    vectors = model.encode(
        passages,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    if vectors.ndim != 2 or vectors.shape != (len(texts), 768):
        raise ValueError("Unexpected embedding dimensions")

    return vectors.tolist()
