CREATE TABLE public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL
        REFERENCES public.documents(id)
        ON DELETE CASCADE,

    chunk_index INTEGER NOT NULL
        CHECK (chunk_index >= 0),

    page_number INTEGER NOT NULL
        CHECK (page_number >= 1),

    content TEXT NOT NULL
        CHECK (length(trim(content)) > 0),

    embedding VECTOR(768),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_chunks_document_chunk_unique
        UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_document_chunks_document_id
    ON public.document_chunks(document_id);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;