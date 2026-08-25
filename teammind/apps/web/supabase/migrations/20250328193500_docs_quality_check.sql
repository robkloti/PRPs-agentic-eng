-- Create document quality flag types
CREATE TYPE flag_type_enum AS ENUM ('outdated', 'inconsistent', 'redundant', 'quality', 'factual');
CREATE TYPE recommended_action_enum AS ENUM ('update', 'merge', 'archive', 'restructure');
CREATE TYPE flag_status_enum AS ENUM ('open', 'in_progress', 'resolved', 'ignored');

-- Table for storing document quality flags (without related_document_ids array)
CREATE TABLE document_quality_flags (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  flag_type flag_type_enum NOT NULL,
  recommended_action recommended_action_enum NOT NULL,
  status flag_status_enum NOT NULL DEFAULT 'open',
  relevancy FLOAT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create normalized table for document flag relations
CREATE TABLE document_quality_flag_relations (
  id BIGSERIAL PRIMARY KEY,
  flag_id BIGINT NOT NULL REFERENCES document_quality_flags(id) ON DELETE CASCADE,
  related_document_id BIGINT NOT NULL REFERENCES documents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Composite unique constraint to prevent duplicate entries
  UNIQUE(flag_id, related_document_id)
);

-- Add indexes for common query patterns
CREATE INDEX idx_document_quality_flags_document_id ON document_quality_flags(document_id);
CREATE INDEX idx_document_quality_flags_status ON document_quality_flags(status);
CREATE INDEX idx_document_quality_flags_type ON document_quality_flags(flag_type);

-- Add indexes for flag relations
CREATE INDEX idx_document_quality_flag_relations_flag_id ON document_quality_flag_relations(flag_id);
CREATE INDEX idx_document_quality_flag_relations_doc_id ON document_quality_flag_relations(related_document_id);

-- Enable RLS
ALTER TABLE document_quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_quality_flag_relations ENABLE ROW LEVEL SECURITY;

-- Update trigger for updated_at
CREATE TRIGGER update_document_quality_flags_updated_at
    BEFORE UPDATE ON document_quality_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up flag relations when a document is deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_document_references()
RETURNS TRIGGER AS $$
DECLARE
    flag_record RECORD;
    relation_count INTEGER;
BEGIN
    -- For each flag that references this document
    FOR flag_record IN 
        SELECT DISTINCT flag_id 
        FROM document_quality_flag_relations
        WHERE related_document_id = OLD.id
    LOOP
        -- Delete the specific relation
        DELETE FROM document_quality_flag_relations
        WHERE flag_id = flag_record.flag_id AND related_document_id = OLD.id;
        
        -- Check how many relations remain for this flag
        SELECT COUNT(*) INTO relation_count
        FROM document_quality_flag_relations
        WHERE flag_id = flag_record.flag_id;
        
        -- Update the flag based on remaining relations
        IF relation_count = 0 THEN
            -- No relations left, mark as resolved
            UPDATE document_quality_flags
            SET details = details || ' [All referenced documents were deleted]',
                status = 'resolved',
                updated_at = timezone('utc'::text, now())
            WHERE id = flag_record.flag_id;
        ELSE
            -- Still has relations, just add note
            UPDATE document_quality_flags
            SET details = details || ' [Note: One referenced document was deleted]',
                updated_at = timezone('utc'::text, now())
            WHERE id = flag_record.flag_id;
        END IF;
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute after document deletion
CREATE TRIGGER document_delete_cleanup_references
AFTER DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION cleanup_deleted_document_references();

-- Function to handle document access removal
CREATE OR REPLACE FUNCTION handle_document_access_removal()
RETURNS TRIGGER AS $$
DECLARE
    access_count INTEGER;
    flag_record RECORD;
    relation_count INTEGER;
BEGIN
    -- Check if this was the last access entry for the document
    SELECT COUNT(*) INTO access_count 
    FROM document_user_access 
    WHERE document_id = OLD.document_id;
    
    IF access_count = 0 THEN
        -- This was the last access entry, update flags for the document
        UPDATE document_quality_flags
        SET details = details || ' [Document scheduled for removal]',
            status = 'resolved',
            updated_at = timezone('utc'::text, now())
        WHERE document_id = OLD.document_id;
        
        -- For each flag that references this document
        FOR flag_record IN 
            SELECT DISTINCT flag_id 
            FROM document_quality_flag_relations
            WHERE related_document_id = OLD.document_id
        LOOP
            -- Check how many relations will remain after this one is considered removed
            SELECT COUNT(*) INTO relation_count
            FROM document_quality_flag_relations
            WHERE flag_id = flag_record.flag_id
            AND related_document_id != OLD.document_id;
            
            -- Update the flag based on remaining relations
            IF relation_count = 0 THEN
                -- No relations left, mark as resolved
                UPDATE document_quality_flags
                SET details = details || ' [All referenced documents scheduled for removal]',
                    status = 'resolved',
                    updated_at = timezone('utc'::text, now())
                WHERE id = flag_record.flag_id;
            ELSE
                -- Still has relations, just add note
                UPDATE document_quality_flags
                SET details = details || ' [Note: One referenced document scheduled for removal]',
                    updated_at = timezone('utc'::text, now())
                WHERE id = flag_record.flag_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document access removal
CREATE TRIGGER document_access_removal_trigger
AFTER DELETE ON document_user_access
FOR EACH ROW
EXECUTE FUNCTION handle_document_access_removal();
    
-- Create RLS policy - everyone with document access can see flags
CREATE POLICY "Users can read their own document flags"
    ON document_quality_flags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM document_user_access ua
            WHERE ua.document_id = document_quality_flags.document_id
            AND ua.user_id = auth.uid()
        )
    );

-- Add UPDATE policy for authenticated users
CREATE POLICY "Users can update status of their own document flags"
    ON document_quality_flags
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM document_user_access ua
            WHERE ua.document_id = document_quality_flags.document_id
            AND ua.user_id = auth.uid()
        )
    );

-- RLS policy for document relations
CREATE POLICY "Users can read flag relations for their documents"
    ON document_quality_flag_relations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM document_quality_flags f
            JOIN document_user_access ua ON f.document_id = ua.document_id
            WHERE f.id = document_quality_flag_relations.flag_id
            AND ua.user_id = auth.uid()
        )
    );

-- Create policies for service role
CREATE POLICY "Service role can manage all flags"
    ON document_quality_flags
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all flag relations"
    ON document_quality_flag_relations
    FOR ALL
    USING (auth.role() = 'service_role');
    
-- Grant access to the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON document_quality_flags TO service_role;
GRANT SELECT ON document_quality_flags TO authenticated;
GRANT UPDATE (status, updated_at) ON document_quality_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_quality_flag_relations TO service_role;
GRANT SELECT ON document_quality_flag_relations TO authenticated;