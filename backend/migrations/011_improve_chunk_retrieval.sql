BEGIN;

-- 011_improve_chunk_retrieval.sql
-- Hybrid retrieval: semantic matches, keyword matches, and adjacent chunks.

DROP FUNCTION IF EXISTS public.match_document_chunks(
    uuid, vector, integer, double precision, uuid
);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
    p_user_id uuid,
    p_query text,
    p_query_embedding vector,
    p_match_count integer,
    p_match_threshold double precision,
    p_document_id uuid
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    filename text,
    page_number integer,
    chunk_index integer,
    content text,
    similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;

    IF p_query IS NULL OR length(trim(p_query)) = 0
       OR length(p_query) > 2000 THEN
        RAISE EXCEPTION 'Query must contain 1 to 2000 characters';
    END IF;

    IF p_match_count < 1 OR p_match_count > 20 THEN
        RAISE EXCEPTION 'Match count must be between 1 and 20';
    END IF;

    IF p_match_threshold < 0 OR p_match_threshold > 1 THEN
        RAISE EXCEPTION 'Match threshold must be between 0 and 1';
    END IF;

    RETURN QUERY
    WITH query_terms AS (
        SELECT DISTINCT term
        FROM regexp_split_to_table(
            lower(p_query),
            '[^[:alnum:]_]+'
        ) AS term
        WHERE length(term) >= 4
          AND term NOT IN (
              'apa', 'saja', 'yang', 'untuk', 'pada', 'dari',
              'dalam', 'dengan', 'adalah', 'utama', 'berapa',
              'jumlah', 'pasien', 'sebagai', 'tersebut',
              'digunakan', 'penelitian', 'fitur'
          )
    ),
    accessible_chunks AS (
        SELECT
            dc.id,
            dc.document_id,
            d.filename::text AS filename,
            dc.page_number,
            dc.chunk_index,
            dc.content,
            CASE
                WHEN dc.embedding IS NULL THEN 0.0
                ELSE (
                    1 - (
                        dc.embedding OPERATOR(public.<=>)
                        p_query_embedding
                    )
                )::double precision
            END AS similarity
        FROM public.document_chunks dc
        INNER JOIN public.documents d
            ON d.id = dc.document_id
        WHERE d.user_id = p_user_id
          AND d.status = 'ready'
          AND (
              p_document_id IS NULL
              OR dc.document_id = p_document_id
          )
    ),
    semantic_candidates AS (
        SELECT
            ac.*,
            3 AS priority,
            0::bigint AS keyword_score
        FROM accessible_chunks ac
        INNER JOIN public.document_chunks dc
            ON dc.id = ac.id
        WHERE dc.embedding IS NOT NULL
          AND ac.similarity >= p_match_threshold
        ORDER BY ac.similarity DESC
        LIMIT greatest(1, (p_match_count + 1) / 2)
    ),
    keyword_candidates AS (
        SELECT
            ac.*,
            4 AS priority,
            count(DISTINCT qt.term)::bigint AS keyword_score
        FROM accessible_chunks ac
        CROSS JOIN query_terms qt
        WHERE position(qt.term IN lower(ac.content)) > 0
        GROUP BY
            ac.id, ac.document_id, ac.filename, ac.page_number,
            ac.chunk_index, ac.content, ac.similarity
        ORDER BY keyword_score DESC, ac.similarity DESC
        LIMIT greatest(1, p_match_count / 4)
    ),
    seeds AS (
        SELECT * FROM semantic_candidates
        UNION ALL
        SELECT * FROM keyword_candidates
    ),
    neighbor_candidates AS (
        SELECT
            ac.*,
            max(
                CASE WHEN s.priority = 4 THEN 2 ELSE 1 END
            ) AS priority,
            max(s.keyword_score) AS keyword_score
        FROM accessible_chunks ac
        INNER JOIN seeds s
            ON ac.document_id = s.document_id
           AND abs(ac.chunk_index - s.chunk_index) = 1
        WHERE NOT EXISTS (
            SELECT 1
            FROM seeds existing
            WHERE existing.id = ac.id
        )
        GROUP BY
            ac.id, ac.document_id, ac.filename, ac.page_number,
            ac.chunk_index, ac.content, ac.similarity
    ),
    all_candidates AS (
        SELECT * FROM seeds
        UNION ALL
        SELECT * FROM neighbor_candidates
    ),
    deduplicated AS (
        SELECT DISTINCT ON (id)
            id,
            document_id,
            filename,
            page_number,
            chunk_index,
            content,
            similarity,
            priority,
            keyword_score
        FROM all_candidates
        ORDER BY
            id,
            priority DESC,
            keyword_score DESC,
            similarity DESC
    )
    SELECT
        dc.id,
        dc.document_id,
        dc.filename,
        dc.page_number,
        dc.chunk_index,
        dc.content,
        dc.similarity
    FROM deduplicated dc
    ORDER BY
        dc.priority DESC,
        dc.keyword_score DESC,
        dc.similarity DESC,
        dc.chunk_index ASC
    LIMIT p_match_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.match_document_chunks(
    uuid, text, vector, integer, double precision, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.match_document_chunks(
    uuid, text, vector, integer, double precision, uuid
) TO service_role;

COMMIT;
