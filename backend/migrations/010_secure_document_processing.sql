
CREATE OR REPLACE FUNCTION public.replace_document_chunks(
    p_document_id uuid,
    p_user_id uuid,
    p_chunks jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_chunk_count integer;
BEGIN
    IF p_chunks IS NULL
       OR jsonb_typeof(p_chunks) <> 'array' THEN
        RAISE EXCEPTION 'Chunks must be a JSON array';
    END IF;

    -- Lock and verify ownership and processing status.
    PERFORM 1
    FROM public.documents
    WHERE id = p_document_id
      AND user_id = p_user_id
      AND status = 'processing'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Document not found, not owned, or not processing';
    END IF;

    -- Validate the chunk structure and embedding dimensions.
    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_chunks) AS item(value)
        WHERE jsonb_typeof(item.value) <> 'object'
           OR NOT (item.value ? 'chunk_index')
           OR NOT (item.value ? 'page_number')
           OR NOT (item.value ? 'content')
           OR NOT (item.value ? 'embedding')
           OR jsonb_typeof(item.value->'chunk_index') <> 'number'
           OR jsonb_typeof(item.value->'page_number') <> 'number'
           OR jsonb_typeof(item.value->'content') <> 'string'
           OR jsonb_typeof(item.value->'embedding') <> 'array'
           OR jsonb_array_length(
               CASE
                   WHEN jsonb_typeof(item.value->'embedding') = 'array'
                   THEN item.value->'embedding'
                   ELSE '[]'::jsonb
               END
           ) <> 768
           OR EXISTS (
               SELECT 1
               FROM jsonb_array_elements(
                   CASE
                       WHEN jsonb_typeof(item.value->'embedding') = 'array'
                       THEN item.value->'embedding'
                       ELSE '[]'::jsonb
                   END
               ) AS element(value)
               WHERE jsonb_typeof(element.value) <> 'number'
           )
    ) THEN
        RAISE EXCEPTION 'Invalid chunk structure or embedding';
    END IF;

    DELETE FROM public.document_chunks
    WHERE document_id = p_document_id;

    INSERT INTO public.document_chunks (
        document_id,
        chunk_index,
        page_number,
        content,
        embedding
    )
    SELECT
        p_document_id,
        (item.value->>'chunk_index')::integer,
        (item.value->>'page_number')::integer,
        item.value->>'content',
        (
            SELECT array_agg(
                element.value::text::double precision
                ORDER BY element.position
            )
            FROM jsonb_array_elements(
                item.value->'embedding'
            ) WITH ORDINALITY AS element(value, position)
        )::public.vector(768)
    FROM jsonb_array_elements(p_chunks) AS item(value);

    GET DIAGNOSTICS v_chunk_count = ROW_COUNT;
    RETURN v_chunk_count;
END;
$function$;

-- Preserve the existing restricted execution permissions.
REVOKE ALL ON FUNCTION public.replace_document_chunks(uuid, uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.replace_document_chunks(uuid, uuid, jsonb)
TO service_role;
