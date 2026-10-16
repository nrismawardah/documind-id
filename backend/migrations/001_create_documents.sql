CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL
        CHECK (file_size_bytes > 0),

    page_count INTEGER
        CHECK (page_count IS NULL OR page_count > 0),

    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (
            status IN (
                'uploaded',
                'processing',
                'ready',
                'failed',
                'deleting'
            )
        ),

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id
    ON public.documents(user_id);

CREATE INDEX idx_documents_status
    ON public.documents(status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;