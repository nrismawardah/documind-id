
CREATE TABLE public.message_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    document_id UUID NOT NULL,

    page_number INTEGER NOT NULL
        CHECK (page_number >= 1),

    quote_text TEXT NOT NULL
        CHECK (length(trim(quote_text)) > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT message_sources_message_chunk_unique
        UNIQUE (message_id, chunk_id),

    CONSTRAINT message_sources_message_conversation_fkey
        FOREIGN KEY (message_id, conversation_id)
        REFERENCES public.messages(id, conversation_id)
        ON DELETE CASCADE,

    CONSTRAINT message_sources_conversation_document_fkey
        FOREIGN KEY (conversation_id, document_id)
        REFERENCES public.conversations(id, document_id)
        ON DELETE CASCADE,

    CONSTRAINT message_sources_chunk_document_fkey
        FOREIGN KEY (chunk_id, document_id)
        REFERENCES public.document_chunks(id, document_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_message_sources_message_id
    ON public.message_sources(message_id);

CREATE INDEX idx_message_sources_chunk_id
    ON public.message_sources(chunk_id);

ALTER TABLE public.message_sources ENABLE ROW LEVEL SECURITY;