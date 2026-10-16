CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN ('user', 'assistant')),

    content TEXT NOT NULL
        CHECK (length(trim(content)) > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id
    ON public.messages(conversation_id);

CREATE INDEX idx_messages_created_at
    ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;