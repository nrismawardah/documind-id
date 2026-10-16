
-- 007_create_rls_policies.sql
-- Frontend access is read-only and restricted by user ownership.
-- Protected write operations are handled by FastAPI.

-- 1. Documents
CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Messages
CREATE POLICY "Users can view messages in their own conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND c.user_id = auth.uid()
    )
);

-- 4. Document chunks are backend-only.
-- No direct frontend access policy is created.

-- 5. Message sources are backend-only.
-- No direct frontend access policy is created.
