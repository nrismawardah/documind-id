
-- Ensure each chunk ID can be referenced together with its document.
ALTER TABLE public.document_chunks
ADD CONSTRAINT document_chunks_id_document_unique
UNIQUE (id, document_id);

-- Ensure each conversation ID can be referenced together with its document.
ALTER TABLE public.conversations
ADD CONSTRAINT conversations_id_document_unique
UNIQUE (id, document_id);

-- Ensure each message ID can be referenced together with its conversation.
ALTER TABLE public.messages
ADD CONSTRAINT messages_id_conversation_unique
UNIQUE (id, conversation_id);