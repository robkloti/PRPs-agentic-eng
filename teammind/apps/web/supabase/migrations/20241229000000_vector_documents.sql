-- Main vector documents migration with performance optimizations:
-- 1. HNSW vector indexes for summary and chunks (~95% faster similarity searches)
-- 2. Optimized GIN index (fastupdate=off) for faster metadata/array retrieval
-- 3. Composite indexes for common query patterns (~20% faster)
-- 4. Efficient document access checks via document_user_access table & indexes
-- Note: Percentages are approximate and depend on data distribution and workload

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- Create enum for document sources
CREATE TYPE document_source AS ENUM ('confluence', 'jira', 'sharepoint', 'notion', 'google_drive', 'gmail', 'pdf');

-- Create main documents table
CREATE TABLE documents (
    id bigserial PRIMARY KEY,
    title text NOT NULL,             -- Title of the document
    hierarchy_path text,             -- Hierarchical path for document if available
    content text NOT NULL,           -- Markdown content
    summary text NOT NULL,           -- Summary of the content
    summary_embedding vector(1024) NOT NULL,  -- Embedding for summary
    metadata jsonb,
    source document_source NOT NULL,
    last_updated_source_user_id text,
    source_author_id text,
    source_mentioned_user_ids text[] DEFAULT array[]::text[],
    source_updated_at timestamp with time zone NOT NULL,
    source_id text NOT NULL,                  -- ID in source system if available
    source_parent_id text,           -- Parent document ID in source system if available
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create document-user access relationship table
CREATE TABLE document_user_access (
    id bigserial PRIMARY KEY,
    document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE, -- When a document is deleted, remove its access entries
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- When a user is deleted, remove their access entries
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Composite unique constraint prevents duplicate entries and provides an index on (document_id, user_id)
    UNIQUE(document_id, user_id)
);

-- Create chunks table
CREATE TABLE document_chunks (
  id bigserial PRIMARY KEY,
  content text NOT NULL,                   -- Chunked content
  embedding vector(1024) NOT NULL,         -- Embedding for chunk
  document_id bigint REFERENCES documents(id) ON DELETE CASCADE, -- Cascade delete chunks when document is deleted
  chunk_index int NOT NULL,                -- Index of the chunk of its sibling chunks
  max_chunk_index int NOT NULL,            -- Total number of chunks for this document
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_user_access ENABLE ROW LEVEL SECURITY;

-- === Optimized Indexes ===

-- --- Indexes on `documents` table ---

-- HNSW index for fast vector similarity search on document summaries (used in initial candidate selection)
CREATE INDEX IF NOT EXISTS idx_documents_summary_embedding ON documents
    USING hnsw (summary_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64); -- Tune M and ef_construction based on recall/performance needs

-- GIN index for metadata queries. fastupdate=off prioritizes query speed over insert speed.
-- Ensure VACUUM is run regularly, especially after bulk inserts/updates.
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents
    USING gin (metadata jsonb_path_ops)
    WITH (fastupdate = off);

-- Composite B-tree index for common filter combinations (e.g., filtering by source and date range)
CREATE INDEX IF NOT EXISTS idx_documents_source_updated ON documents
    USING btree (source, source_updated_at);

-- Index to support efficient lookup by source system ID within a specific source type
CREATE INDEX IF NOT EXISTS idx_documents_source_source_id ON documents (source, source_id);

-- PGroonga index for full text search on document content
CREATE INDEX IF NOT EXISTS idx_documents_content_pgroonga ON documents
USING pgroonga (content pgroonga_text_full_text_search_ops_v2)
WITH (
    tokenizer='TokenNgram(
        "n", 2,
        "unify_alphabet", false,
        "unify_symbol", false,
        "unify_digit", false
    )',
    normalizers='NormalizerNFKC130(
        "unify_kana", true,
        "unify_to_romaji", true,
        "unify_hyphen_and_prolonged_sound", true,
        "remove_symbol", true
    )',
    query_allow_column=true
);

-- --- Indexes on `document_chunks` table ---

-- HNSW index for fast vector similarity search on chunks (used in scoring)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- B-tree index to efficiently find chunks belonging to a specific document
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- PGroonga index for full text search on chunk content
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_pgroonga ON document_chunks
USING pgroonga (content pgroonga_text_full_text_search_ops_v2)
WITH (
    tokenizer='TokenNgram(
        "n", 2,
        "unify_alphabet", false,
        "unify_symbol", false,
        "unify_digit", false
    )',
    normalizers='NormalizerNFKC130(
        "unify_kana", true,
        "unify_to_romaji", true,
        "unify_hyphen_and_prolonged_sound", true,
        "remove_symbol", true
    )',
    query_allow_column=true
);

-- --- Indexes on `document_user_access` table ---

-- The UNIQUE(document_id, user_id) constraint implicitly creates a B-tree index covering lookups by document_id
-- or by document_id and user_id.

-- Specialized index optimized for checking user access (RLS policies, count functions).
-- Covers lookups filtering primarily by user_id.
-- The single-column indexes idx_document_user_access_document_id and idx_document_user_access_user_id are now redundant.
CREATE INDEX IF NOT EXISTS idx_dua_user_id_incl_doc_id ON document_user_access (user_id) INCLUDE (document_id);

-- === Utility Functions and Triggers ===

-- Update timestamp functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_document_chunks_updated_at
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to upsert a document with user access
CREATE OR REPLACE FUNCTION upsert_document_with_access(
  -- Document parameters - all required parameters first, optional parameters at the end
  title TEXT,
  content TEXT,
  summary TEXT,
  summary_embedding VECTOR(1024),
  source document_source,
  source_updated_at TIMESTAMPTZ,
  source_id TEXT,
  user_ids_access UUID[],
  -- Optional parameters with defaults at the end
  hierarchy_path TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  last_updated_source_user_id TEXT DEFAULT NULL,
  source_author_id TEXT DEFAULT NULL,
  source_mentioned_user_ids TEXT[] DEFAULT NULL,
  source_parent_id TEXT DEFAULT NULL,
  -- Return values
  OUT document_id BIGINT,
  OUT is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_doc_id BIGINT;
  v_existing_user_ids UUID[];
  loop_user_id UUID; -- Avoid ambiguity
BEGIN
  -- Check if document exists with the same source & source_id
  SELECT d.id INTO v_existing_doc_id
  FROM documents d
  WHERE d.source = upsert_document_with_access.source 
    AND d.source_id = upsert_document_with_access.source_id
  LIMIT 1;
  
  IF v_existing_doc_id IS NOT NULL THEN
    -- UPDATE PATH
    is_new := FALSE;
    document_id := v_existing_doc_id;
    
    -- Get existing user access
    SELECT ARRAY_AGG(dua.user_id) INTO v_existing_user_ids
    FROM document_user_access dua
    WHERE dua.document_id = v_existing_doc_id;
    
    -- Update document 
    UPDATE documents
    SET 
      title = upsert_document_with_access.title,
      hierarchy_path = upsert_document_with_access.hierarchy_path,
      content = upsert_document_with_access.content,
      summary = upsert_document_with_access.summary,
      summary_embedding = upsert_document_with_access.summary_embedding,
      metadata = upsert_document_with_access.metadata,
      last_updated_source_user_id = upsert_document_with_access.last_updated_source_user_id,
      source_author_id = upsert_document_with_access.source_author_id,
      source_mentioned_user_ids = COALESCE(upsert_document_with_access.source_mentioned_user_ids, ARRAY[]::text[]),
      source_updated_at = upsert_document_with_access.source_updated_at,
      source_parent_id = upsert_document_with_access.source_parent_id,
      updated_at = NOW()
    WHERE id = v_existing_doc_id;
    
    -- Delete existing chunks
    DELETE FROM document_chunks dc
    WHERE dc.document_id = v_existing_doc_id;
    
    -- Delete quality flags to be recreated
    DELETE FROM document_quality_flags dqf
    WHERE dqf.document_id = v_existing_doc_id;
    
    -- Add new user access for users who don't already have it
    FOREACH loop_user_id IN ARRAY user_ids_access
    LOOP
      IF NOT (loop_user_id = ANY(COALESCE(v_existing_user_ids, '{}'::uuid[]))) THEN
        INSERT INTO document_user_access (document_id, user_id)
        VALUES (v_existing_doc_id, loop_user_id);
      END IF;
    END LOOP;
    
  ELSE
    -- INSERT PATH
    is_new := TRUE;
    
    -- Insert document
    INSERT INTO documents (
      title,
      hierarchy_path,
      content,
      summary,
      summary_embedding,
      metadata,
      source,
      last_updated_source_user_id,
      source_author_id,
      source_mentioned_user_ids,
      source_updated_at,
      source_id,
      source_parent_id
    ) VALUES (
      upsert_document_with_access.title,
      upsert_document_with_access.hierarchy_path,
      upsert_document_with_access.content,
      upsert_document_with_access.summary,
      upsert_document_with_access.summary_embedding,
      upsert_document_with_access.metadata,
      upsert_document_with_access.source,
      upsert_document_with_access.last_updated_source_user_id,
      upsert_document_with_access.source_author_id,
      COALESCE(upsert_document_with_access.source_mentioned_user_ids, ARRAY[]::text[]),
      upsert_document_with_access.source_updated_at,
      upsert_document_with_access.source_id,
      upsert_document_with_access.source_parent_id
    )
    RETURNING id INTO document_id;
    
    -- Add access for all users
    FOREACH loop_user_id IN ARRAY user_ids_access
    LOOP
      INSERT INTO document_user_access (document_id, user_id)
      VALUES (document_id, loop_user_id);
    END LOOP;
  END IF;
END;
$$;

-- Function to delete a document by source ID and type
CREATE OR REPLACE FUNCTION delete_document_by_source(
  source_id_input TEXT,
  source_type_input document_source,
  user_id_input UUID,
  OUT document_id BIGINT,
  OUT deleted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id BIGINT;
BEGIN
  -- Find document ID, but only if user has access
  SELECT d.id INTO v_document_id
  FROM documents d
  JOIN document_user_access ua ON d.id = ua.document_id
  WHERE d.source = source_type_input 
    AND d.source_id = source_id_input
    AND ua.user_id = user_id_input
  LIMIT 1;
  
  -- Initialize return values
  document_id := v_document_id;
  deleted := FALSE;
  
  -- If document found and user has access, delete it
  IF v_document_id IS NULL THEN
    RETURN; -- Document not found or user doesn't have access
  END IF;
  
  -- Delete the document - ON DELETE CASCADE will handle related records
  DELETE FROM documents WHERE id = v_document_id;
  deleted := TRUE;
  
  RETURN;
END;
$$;

-- FUNCTION: match_documents_hierarchical
-- 
-- DESCRIPTION:
-- This function performs a hierarchical document matching process based on both semantic vector embeddings and keyword text search.
-- It returns a table of document chunks that match the given query, sorted by a combined similarity score.
-- 
-- PARAMETERS:
-- - query_embedding (vector(1024)): The embedding vector for the query.
-- - hyde_embedding (vector(1024)): The embedding vector for the HYDE model.
-- - query_text (text): The text of the query.
-- - target_user_id (uuid): The ID of the target user.
-- - source_types (document_source[], DEFAULT null): The type of document source to filter by.
-- - keyword_weight (float, DEFAULT 0.5): The weight for keyword matching in the combined score.
-- - semantic_weight (float, DEFAULT 0.5): The weight for semantic matching in the combined score.
-- - doc_search_limit (int, DEFAULT 32): The maximum number of candidate documents to consider.
-- - chunk_search_limit (int, DEFAULT 512): The maximum number of document chunks to return.
-- - start_date (timestamp with time zone, DEFAULT null): The start date for filtering documents.
-- - end_date (timestamp with time zone, DEFAULT null): The end date for filtering documents.
-- - similarity_threshold (float, DEFAULT 0.2): The minimum threshold for vector similarity matches.
-- - exclude_document_ids (bigint[], DEFAULT null): The IDs of documents to exclude from the search.
-- - metadata_filter (jsonb, DEFAULT null): A JSONB object for filtering documents based on metadata.
-- - strict_metadata_matching (boolean, DEFAULT false): Whether to enforce strict matching for metadata filters.
-- 
-- RETURNS:
-- A table with the following columns:
-- - id (bigint): The ID of the document chunk.
-- - content (text): The content of the document chunk.
-- - title (text): The title of the document.
-- - metadata (jsonb): The metadata of the document.
-- - source (document_source): The source type of the document.
-- - similarity (double precision): The combined similarity score of the document chunk.
-- - document_id (bigint): The ID of the document.
-- - source_id (text): The ID of the document in the source system.
-- - source_parent_id (text): The parent ID of the document in the source system.
-- - hierarchy_path (text): The hierarchical path of the document.
-- - chunk_index (int): The index of the chunk within the document.
-- - max_chunk_index (int): The maximum chunk index within the document.
-- - source_updated_at (timestamp with time zone): The last updated timestamp of the document in the source system.
CREATE OR REPLACE FUNCTION match_documents_hierarchical(
    query_embedding vector(1024),
    hyde_embedding vector(1024),
    query_text text,
    target_user_id uuid,
    source_types document_source[] DEFAULT null,
    keyword_weight float DEFAULT 0.5,
    semantic_weight float DEFAULT 0.5,
    doc_search_limit int DEFAULT 32,
    chunk_search_limit int DEFAULT 512,
    start_date timestamp with time zone DEFAULT null,
    end_date timestamp with time zone DEFAULT null,
    similarity_threshold float DEFAULT 0.2,
    exclude_document_ids bigint[] DEFAULT null,
    metadata_filter jsonb DEFAULT null,
    strict_metadata_matching boolean DEFAULT false
) RETURNS TABLE (
    id bigint,
    content text,
    title text,
    metadata jsonb,
    source document_source,
    similarity double precision,
    document_id bigint,
    chunk_index int,
    max_chunk_index int,
    source_id text,
    source_parent_id text,
    hierarchy_path text,
    source_updated_at timestamp with time zone
)
LANGUAGE plpgsql
PARALLEL SAFE
SET statement_timeout TO '30s'
AS $$
DECLARE
    total_weight float;
BEGIN
    -- Normalize weights
    total_weight := keyword_weight + semantic_weight;
    IF total_weight <= 0 THEN -- Avoid division by zero if both weights are zero
        keyword_weight := 0.5;
        semantic_weight := 0.5;
    ELSE
        keyword_weight := keyword_weight / total_weight;
        semantic_weight := semantic_weight / total_weight;
    END IF;

    RETURN QUERY
    -- Stage 1: Find candidate documents (no scoring, just filtering)
    -- Uses indexes: idx_dua_user_id_incl_doc_id, idx_documents_source_updated,
    --               idx_documents_summary_embedding (HNSW), idx_documents_content_pgroonga
    WITH document_candidates AS MATERIALIZED (
        SELECT
            d.id AS doc_id
        FROM documents d
        JOIN document_user_access ua ON d.id = ua.document_id
        WHERE ua.user_id = target_user_id
            AND (start_date IS NULL OR d.source_updated_at >= start_date)
            AND (end_date IS NULL OR d.source_updated_at <= end_date)
            AND (source_types IS NULL OR d.source = ANY(source_types))
            AND (exclude_document_ids IS NULL OR NOT (d.id = ANY(exclude_document_ids)))
            -- Generic metadata filtering logic
            AND (
                metadata_filter IS NULL
                OR
                (
                    -- For each key-value pair in metadata_filter
                    (SELECT bool_and(
                        CASE
                            -- Handle missing properties based on strict_metadata_matching flag
                            WHEN d.metadata->key IS NULL THEN 
                                NOT strict_metadata_matching -- Include if not strict, exclude if strict
                                
                            -- Handle boolean/string type mismatch
                            WHEN jsonb_typeof(d.metadata->key) = 'boolean' AND jsonb_typeof(value) = 'string' THEN
                                CASE 
                                    WHEN (value#>>'{}'= 'true' AND (d.metadata->key)::boolean = true) OR
                                         (value#>>'{}'= 'false' AND (d.metadata->key)::boolean = false) THEN true
                                    ELSE false
                                END
                            -- Handle string/boolean type mismatch
                            WHEN jsonb_typeof(d.metadata->key) = 'string' AND jsonb_typeof(value) = 'boolean' THEN
                                CASE 
                                    WHEN ((d.metadata->>key) = 'true' AND value::boolean = true) OR
                                         ((d.metadata->>key) = 'false' AND value::boolean = false) THEN true
                                    ELSE false
                                END
                            -- When the filter value is an array
                            WHEN jsonb_typeof(value) = 'array' THEN
                                (d.metadata->key IS NOT NULL AND 
                                 (
                                     -- If metadata value is scalar, check if it matches any element in the filter array
                                     (jsonb_typeof(d.metadata->key) != 'array' AND
                                      d.metadata->>key = ANY(ARRAY(SELECT jsonb_array_elements_text(value))))
                                     OR
                                     -- If metadata value is array, check if there's any overlap
                                     (jsonb_typeof(d.metadata->key) = 'array' AND
                                      d.metadata->key ?| ARRAY(SELECT jsonb_array_elements_text(value)))
                                 )
                                )
                            -- When the filter value is not an array, use standard containment
                            ELSE
                                d.metadata->key IS NOT NULL AND d.metadata->key @> value
                        END
                    ) FROM jsonb_each(metadata_filter))
                )
            )
            -- Simple boolean filter: match either vector similarity OR text search.
            -- The planner will attempt to use indexes for both parts of the OR.
            AND (
                (1 - (d.summary_embedding <=> query_embedding)) > similarity_threshold
                OR
                d.content &@~ query_text
            )
        LIMIT doc_search_limit
    ),

    -- Stage 2: Score chunks from candidate documents
    -- Uses indexes: idx_document_chunks_embedding (HNSW), idx_document_chunks_content_pgroonga
    chunk_scores AS MATERIALIZED (
        SELECT
            c.id,
            c.content,
            d.title,
            d.metadata,
            d.source,
            d.source_id,
            d.source_parent_id,
            d.hierarchy_path,
            c.document_id,
            c.chunk_index,
            c.max_chunk_index,
            d.source_updated_at,
            -- Semantic score (cosine similarity using hyde embedding)
            (1 - (c.embedding <=> hyde_embedding))::double precision AS semantic_score,
            -- Keyword score (0 if no match, otherwise raw PGroonga score)
            CASE WHEN c.content &@~ query_text THEN
                pgroonga_score(c.tableoid, c.ctid)::double precision
            ELSE 0::double precision END AS keyword_raw_score
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        -- Only join chunks whose documents were selected in Stage 1
        WHERE c.document_id IN (SELECT doc_id FROM document_candidates)
          -- Filter chunks based on similarity OR text match. This might re-evaluate some conditions,
          -- but ensures chunks that didn't match the *document* filter criteria can still be included
          -- if they individually match the *chunk* filter criteria.
          AND ((1 - (c.embedding <=> hyde_embedding)) > similarity_threshold
                 OR c.content &@~ query_text)
    ),

    -- Get score statistics for normalization
    score_stats AS (
        SELECT
            MAX(semantic_score) AS max_semantic,
            MIN(semantic_score) AS min_semantic,
            -- Handle case where no keyword matches occur
            MAX(keyword_raw_score) AS max_keyword,
            MIN(CASE WHEN keyword_raw_score > 0 THEN keyword_raw_score ELSE NULL END) AS min_keyword
        FROM chunk_scores
    ),

    -- Calculate weighted scores with normalization
    weighted_scores AS (
        SELECT
            cs.*,
            -- Calculate combined score with normalized components
            (
                -- Semantic component (min-max normalized)
                semantic_weight *
                CASE
                    WHEN (ss.max_semantic IS NULL OR ss.min_semantic IS NULL OR ss.max_semantic - ss.min_semantic = 0) THEN 0.5 -- Default score if normalization isn't possible
                    ELSE GREATEST(0.0, LEAST(1.0, (cs.semantic_score - ss.min_semantic) / (ss.max_semantic - ss.min_semantic)))
                END +

                -- Keyword component (min-max normalized)
                keyword_weight *
                CASE
                    WHEN cs.keyword_raw_score <= 0 THEN 0.0 -- No keyword match gets 0 score
                    WHEN (ss.max_keyword IS NULL OR ss.min_keyword IS NULL OR ss.max_keyword - ss.min_keyword = 0) THEN 1.0 -- If only one match, give it full score
                    ELSE GREATEST(0.0, LEAST(1.0, (cs.keyword_raw_score - ss.min_keyword) / (ss.max_keyword - ss.min_keyword)))
                END
            ) AS combined_score
        FROM chunk_scores cs, score_stats ss
    )

    -- Return results sorted by combined score
    SELECT
        ws.id,
        ws.content,
        ws.title,
        ws.metadata,
        ws.source,
        ws.combined_score AS similarity,
        ws.document_id,
        ws.chunk_index,
        ws.max_chunk_index,
        ws.source_id,
        ws.source_parent_id,
        ws.hierarchy_path,
        ws.source_updated_at
    FROM weighted_scores ws
    -- Filter out results below the similarity threshold *after* normalization/weighting if desired,
    -- although the threshold is currently applied *before* scoring. Consider if threshold should apply to final combined_score.
    ORDER BY combined_score DESC
    LIMIT chunk_search_limit;
END;
$$;


-- Returns count of documents, optionally filtered by source and metadata
-- Benefits from idx_dua_user_id_incl_doc_id and potentially idx_documents_source_updated, idx_documents_metadata (@> requires this)
CREATE OR REPLACE FUNCTION count_documents_by_source(
  source_input document_source DEFAULT NULL,
  filter_object jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
SECURITY DEFINER
SET search_path = public
PARALLEL SAFE
AS $$
DECLARE
  doc_count bigint;
BEGIN
  SELECT count(DISTINCT d.id) INTO doc_count
  FROM documents d
  JOIN document_user_access ua ON d.id = ua.document_id
  WHERE ua.user_id = auth.uid() -- Check access first
    AND (source_input IS NULL OR d.source = source_input)
    -- Handle type mismatches in filter
    AND (
      filter_object = '{}'::jsonb
      OR
      (SELECT bool_and(
        CASE
          -- Handle boolean/string type mismatch
          WHEN jsonb_typeof(d.metadata->key) = 'boolean' AND jsonb_typeof(value) = 'string' THEN
            CASE 
              WHEN (value#>>'{}'= 'true' AND (d.metadata->key)::boolean = true) OR
                   (value#>>'{}'= 'false' AND (d.metadata->key)::boolean = false) THEN true
              ELSE false
            END
          -- Handle string/boolean type mismatch
          WHEN jsonb_typeof(d.metadata->key) = 'string' AND jsonb_typeof(value) = 'boolean' THEN
            CASE 
              WHEN ((d.metadata->>key) = 'true' AND value::boolean = true) OR
                   ((d.metadata->>key) = 'false' AND value::boolean = false) THEN true
              ELSE false
            END
          -- Standard containment for same types
          ELSE
            d.metadata->key IS NOT NULL AND d.metadata->key @> value
        END
      ) FROM jsonb_each(filter_object))
    );
  RETURN doc_count;
END;
$$ LANGUAGE plpgsql;


-- Function to count documents by source type using document_user_access
-- Benefits from idx_dua_user_id_incl_doc_id
CREATE OR REPLACE FUNCTION count_documents_by_source_type()
RETURNS jsonb
SECURITY DEFINER -- Requires careful consideration of privileges
SET search_path = public
PARALLEL SAFE
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  result jsonb := '{}'::jsonb;
  source_count record;
  source_type text;
BEGIN
  -- Use optimized join with document_user_access table
  FOR source_count IN (
    SELECT
      d.source::text AS src,
      count(DISTINCT d.id) AS cnt -- Count distinct documents
    FROM documents d
    JOIN document_user_access ua ON d.id = ua.document_id
    WHERE ua.user_id = current_user_id
    GROUP BY d.source
  ) LOOP
    result := result || jsonb_build_object(source_count.src, source_count.cnt);
  END LOOP;

  -- Add missing source types with zero counts
  FOR source_type IN
    SELECT unnest(enum_range(NULL::document_source))::text
  LOOP
    IF NOT (result ? source_type) THEN
      result := result || jsonb_build_object(source_type, 0);
    END IF;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to manage document user access
-- Benefits from UNIQUE index on document_user_access for conflict handling
-- Benefits from idx_documents_metadata (@>) and potentially idx_documents_source_source_id for finding documents
CREATE OR REPLACE FUNCTION manage_document_user_access(
  source_input document_source,
  target_user_id uuid,
  operation text, -- 'add' or 'remove'
  metadata_filter jsonb DEFAULT NULL,
  source_ids text[] DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc_ids bigint[];
BEGIN
  -- Input validation
  IF operation NOT IN ('add', 'remove') THEN
    RAISE EXCEPTION 'Invalid operation: must be ''add'' or ''remove''';
  END IF;

  -- Find matching documents with flexible metadata matching
  WITH matching_docs AS (
    SELECT d.id
    FROM documents d
    WHERE d.source = source_input
      -- Process source_ids filter if provided
      AND (source_ids IS NULL OR d.source_id = ANY(source_ids))
      -- More flexible metadata filtering that handles arrays and type mismatches
      AND (
        metadata_filter IS NULL
        OR
        (
          -- Check each key-value pair in metadata_filter
          (SELECT bool_and(
            CASE
              -- Handle boolean/string type mismatch
              WHEN jsonb_typeof(d.metadata->key) = 'boolean' AND jsonb_typeof(value) = 'string' THEN
                CASE 
                  WHEN (value#>>'{}'= 'true' AND (d.metadata->key)::boolean = true) OR
                       (value#>>'{}'= 'false' AND (d.metadata->key)::boolean = false) THEN true
                  ELSE false
                END
              -- Handle string/boolean type mismatch
              WHEN jsonb_typeof(d.metadata->key) = 'string' AND jsonb_typeof(value) = 'boolean' THEN
                CASE 
                  WHEN ((d.metadata->>key) = 'true' AND value::boolean = true) OR
                       ((d.metadata->>key) = 'false' AND value::boolean = false) THEN true
                  ELSE false
                END
              -- When the filter value is an array
              WHEN jsonb_typeof(value) = 'array' THEN
                (d.metadata->key IS NOT NULL AND 
                 (
                   -- If metadata value is scalar, check if it matches any element in the filter array
                   (jsonb_typeof(d.metadata->key) != 'array' AND
                    d.metadata->>key = ANY(ARRAY(SELECT jsonb_array_elements_text(value))))
                   OR
                   -- If metadata value is array, check if there's any overlap
                   (jsonb_typeof(d.metadata->key) = 'array' AND
                    d.metadata->key ?| ARRAY(SELECT jsonb_array_elements_text(value)))
                 )
                )
              -- When the filter value is not an array, use standard containment
              ELSE
                d.metadata->key IS NOT NULL AND d.metadata->key @> value
            END
          ) FROM jsonb_each(metadata_filter))
        )
      )
  )
  SELECT array_agg(id) INTO doc_ids
  FROM matching_docs;
  -- If no documents found, exit early
  IF doc_ids IS NULL OR array_length(doc_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Process each document based on operation
  IF operation = 'add' THEN
    -- Insert new access records, ignoring duplicates due to unique constraint
    INSERT INTO document_user_access (document_id, user_id)
    SELECT unnest(doc_ids), target_user_id
    ON CONFLICT (document_id, user_id) DO NOTHING;

  ELSIF operation = 'remove' THEN
    -- Remove access records using the found document IDs and target user
    DELETE FROM document_user_access
    WHERE user_id = target_user_id
      AND document_id = ANY(doc_ids);
  END IF;
END;
$$;


-- Function to cleanup orphaned documents
CREATE OR REPLACE FUNCTION cleanup_orphaned_docs(cutoff_date timestamp with time zone)
RETURNS TABLE (
    deleted_chunks integer,
    deleted_docs integer
)
SECURITY DEFINER -- Requires permission to delete across all documents/chunks
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    chunks_count integer;
    docs_count integer;
BEGIN
    -- First delete orphaned chunks (using LEFT JOIN / IS NULL for potential optimization)
    WITH chunks_to_delete AS (
        DELETE FROM document_chunks c
        USING (
            SELECT c_inner.id
            FROM document_chunks c_inner
            LEFT JOIN documents d ON c_inner.document_id = d.id
            WHERE d.id IS NULL
        ) AS orphaned
        WHERE c.id = orphaned.id
        RETURNING 1 -- Use RETURNING 1 for simple counting
    )
    SELECT count(*) INTO chunks_count FROM chunks_to_delete;

    -- Then delete documents with no access older than cutoff_date
    WITH docs_to_delete AS (
        DELETE FROM documents d
        WHERE NOT EXISTS (
            SELECT 1
            FROM document_user_access a
            WHERE a.document_id = d.id
        )
        AND d.updated_at < cutoff_date -- Use the timestamp condition
        RETURNING 1
    )
    SELECT count(*) INTO docs_count FROM docs_to_delete;

    RETURN QUERY SELECT chunks_count, docs_count;
END;
$$;

-- Function to get documents by source ID with metadata filters
CREATE OR REPLACE FUNCTION get_documents_by_source_id(
  source_ids_input text[],
  source_type_input text,
  metadata_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  source_id text,
  metadata jsonb,
  user_ids_access uuid[],
  source_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    WITH filtered_docs AS (
      SELECT
        doc.id,
        doc.source_id,
        doc.metadata,
        doc.source_updated_at
      FROM
        documents doc
      WHERE
        doc.source::text = source_type_input
        AND doc.source_id = ANY(source_ids_input)
        AND (
          metadata_filters = '{}'::jsonb
          OR
          (SELECT bool_and(
            CASE
              -- Handle boolean/string type mismatch
              WHEN jsonb_typeof(doc.metadata->key) = 'boolean' AND jsonb_typeof(value) = 'string' THEN
                CASE 
                  WHEN (value#>>'{}'= 'true' AND (doc.metadata->key)::boolean = true) OR
                       (value#>>'{}'= 'false' AND (doc.metadata->key)::boolean = false) THEN true
                  ELSE false
                END
              -- Handle string/boolean type mismatch
              WHEN jsonb_typeof(doc.metadata->key) = 'string' AND jsonb_typeof(value) = 'boolean' THEN
                CASE 
                  WHEN ((doc.metadata->>key) = 'true' AND value::boolean = true) OR
                       ((doc.metadata->>key) = 'false' AND value::boolean = false) THEN true
                  ELSE false
                END
              -- Handle array values in filter
              WHEN jsonb_typeof(value) = 'array' THEN
                (doc.metadata->key IS NOT NULL AND 
                 (
                   -- If metadata value is scalar, check if it matches any element in the filter array
                   (jsonb_typeof(doc.metadata->key) != 'array' AND
                    doc.metadata->>key = ANY(ARRAY(SELECT jsonb_array_elements_text(value))))
                   OR
                   -- If metadata value is array, check if there's any overlap
                   (jsonb_typeof(doc.metadata->key) = 'array' AND
                    doc.metadata->key ?| ARRAY(SELECT jsonb_array_elements_text(value)))
                 )
                )
              -- Standard containment for same types
              ELSE
                doc.metadata->key IS NOT NULL AND doc.metadata->key @> value
            END
          ) FROM jsonb_each(metadata_filters))
        )
    )
    SELECT
      d.source_id,
      d.metadata,
      COALESCE(array_agg(ua.user_id) FILTER (WHERE ua.user_id IS NOT NULL), ARRAY[]::uuid[]) AS user_ids_access,
      d.source_updated_at
    FROM
      filtered_docs d
    LEFT JOIN
      document_user_access ua ON d.id = ua.document_id
    GROUP BY
      d.id, d.source_id, d.metadata, d.source_updated_at;
END;
$$;

-- === Permissions ===

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_document_with_access TO service_role;
GRANT EXECUTE ON FUNCTION delete_document_by_source TO service_role;
GRANT EXECUTE ON FUNCTION count_documents_by_source TO authenticated;
GRANT EXECUTE ON FUNCTION count_documents_by_source_type TO authenticated;
GRANT EXECUTE ON FUNCTION manage_document_user_access TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_docs TO service_role;
GRANT EXECUTE ON FUNCTION match_documents_hierarchical TO service_role; -- Or authenticated if users call it directly
GRANT EXECUTE ON FUNCTION get_documents_by_source_id TO service_role; -- Or authenticated if users call it directly

-- Grant table access (service_role typically needs full access for management tasks)
GRANT ALL ON document_user_access TO service_role;
GRANT ALL ON documents TO service_role;
GRANT ALL ON document_chunks TO service_role;

-- Grant necessary access for authenticated users (primarily SELECT for reading)
GRANT SELECT ON document_user_access TO authenticated;

-- Grant select access to specific document columns only for authenticated users
GRANT SELECT(
    id,
    title,
    content, -- Needed for display/context, RLS ensures they only see allowed content
    summary,
    source,
    metadata,
    hierarchy_path,
    source_id,
    source_parent_id,
    source_updated_at,
    created_at,
    updated_at
) ON documents TO authenticated;

-- Grant select access to specific chunk columns only for authenticated users
GRANT SELECT(
    id,
    content, -- Needed for display/context, RLS ensures they only see allowed content
    document_id,
    chunk_index,
    max_chunk_index,
    created_at,
    updated_at
) ON document_chunks TO authenticated;

-- === Row Level Security (RLS) Policies ===

-- Create RLS policy for documents that uses document_user_access
CREATE POLICY "Users can view documents they have access to" ON documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM document_user_access ua
            WHERE ua.document_id = documents.id AND ua.user_id = auth.uid()
        )
    );

-- Create RLS policy for document_chunks based on access to the parent document
CREATE POLICY "Users can view chunks of documents they have access to" ON document_chunks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM document_user_access ua
            WHERE ua.document_id = document_chunks.document_id AND ua.user_id = auth.uid()
        )
    );

-- Create RLS policy for document_user_access
CREATE POLICY "Users can view their own access entries" ON document_user_access
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role has full access" ON documents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access" ON document_chunks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role has full access" ON document_user_access FOR ALL TO service_role USING (true);
