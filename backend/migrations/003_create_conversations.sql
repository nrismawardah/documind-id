CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    document_id UUID NOT NULL
        REFERENCES public.documents(id)
        ON DELETE CASCADE,

    title TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_id_user_unique
        UNIQUE (id, user_id),

    CONSTRAINT conversations_document_user_fkey
        FOREIGN KEY (document_id, user_id)
        REFERENCES public.documents(id, user_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_conversations_user_id
    ON public.conversations(user_id);

CREATE INDEX idx_conversations_document_id
    ON public.conversations(document_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;