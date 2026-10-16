
-- 008_restrict_table_privileges.sql
-- Restrict direct access through the Supabase Data API.
-- FastAPI uses the server-side service_role for protected operations.

-- 1. Remove direct table privileges from public API roles.
REVOKE ALL PRIVILEGES
ON TABLE
    public.documents,
    public.document_chunks,
    public.conversations,
    public.messages,
    public.message_sources
FROM anon, authenticated;

-- 2. Authenticated users can read their own documents.
-- Row-level security policies enforce ownership.
GRANT SELECT
ON TABLE public.documents
TO authenticated;

-- 3. Authenticated users can read their own conversations.
GRANT SELECT
ON TABLE public.conversations
TO authenticated;

-- 4. Authenticated users can read messages in their own conversations.
GRANT SELECT
ON TABLE public.messages
TO authenticated;

-- 5. Internal processing tables are backend-only.
-- No direct table privileges are granted to anon or authenticated
-- for document_chunks and message_sources.
--
-- 6. FastAPI uses service_role for protected database operations.
-- service_role privileges are intentionally not revoked here.
