-- Create action item status enum
CREATE TYPE action_item_status_enum AS ENUM ('backlog', 'todo', 'in_progress', 'blocked', 'done', 'ignored');

-- Table for storing action items 
CREATE TABLE document_action_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  status action_item_status_enum NOT NULL DEFAULT 'backlog',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create normalized table for action item to document relations
CREATE TABLE document_action_item_relations (
  id BIGSERIAL PRIMARY KEY,
  action_item_id BIGINT NOT NULL REFERENCES document_action_items(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES documents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Composite unique constraint to prevent duplicate entries
  UNIQUE(action_item_id, document_id)
);

-- Add indexes for common query patterns
CREATE INDEX idx_document_action_items_user_id ON document_action_items(user_id);
CREATE INDEX idx_document_action_items_status ON document_action_items(status);

-- Add indexes for action item relations
CREATE INDEX idx_document_action_item_relations_item_id ON document_action_item_relations(action_item_id);
CREATE INDEX idx_document_action_item_relations_doc_id ON document_action_item_relations(document_id);

-- Enable RLS
ALTER TABLE document_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_action_item_relations ENABLE ROW LEVEL SECURITY;

-- Update trigger for updated_at
CREATE TRIGGER update_document_action_items_updated_at
    BEFORE UPDATE ON document_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up action item relations when a document is deleted
CREATE OR REPLACE FUNCTION cleanup_deleted_document_action_references()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    relation_count INTEGER;
BEGIN
    -- For each action item that references this document
    FOR item_record IN 
        SELECT DISTINCT action_item_id 
        FROM document_action_item_relations
        WHERE document_id = OLD.id
    LOOP
        -- Delete the specific relation
        DELETE FROM document_action_item_relations
        WHERE action_item_id = item_record.action_item_id AND document_id = OLD.id;
        
        -- Check how many relations remain for this action item
        SELECT COUNT(*) INTO relation_count
        FROM document_action_item_relations
        WHERE action_item_id = item_record.action_item_id;
        
        -- If no relations left, delete the action item
        IF relation_count = 0 THEN
            DELETE FROM document_action_items
            WHERE id = item_record.action_item_id;
        END IF;
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute after document deletion
CREATE TRIGGER document_delete_cleanup_action_references
AFTER DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION cleanup_deleted_document_action_references();

-- Function to handle document access removal
CREATE OR REPLACE FUNCTION handle_document_action_access_removal()
RETURNS TRIGGER AS $$
DECLARE
    access_count INTEGER;
    item_record RECORD;
    relation_count INTEGER;
BEGIN
    -- Check if this was the last access entry for the document
    SELECT COUNT(*) INTO access_count 
    FROM document_user_access 
    WHERE document_id = OLD.document_id;
    
    IF access_count = 0 THEN
        -- For each action item that references this document
        FOR item_record IN 
            SELECT DISTINCT action_item_id 
            FROM document_action_item_relations
            WHERE document_id = OLD.document_id
        LOOP
            -- Delete the specific relation
            DELETE FROM document_action_item_relations
            WHERE action_item_id = item_record.action_item_id AND document_id = OLD.document_id;
            
            -- Check how many relations remain for this action item
            SELECT COUNT(*) INTO relation_count
            FROM document_action_item_relations
            WHERE action_item_id = item_record.action_item_id;
            
            -- If no relations left, delete the action item
            IF relation_count = 0 THEN
                DELETE FROM document_action_items
                WHERE id = item_record.action_item_id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document access removal
CREATE TRIGGER document_action_access_removal_trigger
AFTER DELETE ON document_user_access
FOR EACH ROW
EXECUTE FUNCTION handle_document_action_access_removal();
    
-- Create RLS policy - users can see their own action items
CREATE POLICY "Users can read their own action items"
    ON document_action_items
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Users can update their own action items
CREATE POLICY "Users can update their own action items"
    ON document_action_items
    FOR UPDATE
    USING (
        user_id = auth.uid()
    );

-- Users can delete their own action items
CREATE POLICY "Users can delete their own action items"
    ON document_action_items
    FOR DELETE
    USING (
        user_id = auth.uid()
    );

-- RLS policy for action item relations - users can see relations for items they own
CREATE POLICY "Users can read action item relations for their items"
    ON document_action_item_relations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM document_action_items ai
            WHERE ai.id = document_action_item_relations.action_item_id
            AND ai.user_id = auth.uid()
        )
    );

-- Create policies for service role
CREATE POLICY "Service role can manage all action items"
    ON document_action_items
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all action item relations"
    ON document_action_item_relations
    FOR ALL
    USING (auth.role() = 'service_role');
    
-- Grant access to the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON document_action_items TO service_role;
GRANT SELECT, INSERT, UPDATE ON document_action_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_action_item_relations TO service_role;
GRANT SELECT ON document_action_item_relations TO authenticated;

-- Create the RPC function for finding documents with potential action items
CREATE OR REPLACE FUNCTION public.find_action_item_documents(
  p_user_id UUID, 
  mentions TEXT[],
  source_ids TEXT[],
  p_days_interval INTEGER DEFAULT 30 -- Default to 30 days if not specified
)
RETURNS TABLE (document_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  time_interval TIMESTAMP WITH TIME ZONE := (NOW() - (p_days_interval || ' days')::INTERVAL);
BEGIN
  -- Find documents that:
  -- 1. User has access to
  -- 2. Were updated within the specified time interval
  -- 3. Don't already have action items for this user created after the document was last updated
  -- 4. Might mention the user via the provided mentions array
  -- 5. Or has source IDs matching the provided source_ids array
  RETURN QUERY
  WITH user_documents AS (
    SELECT 
      d.id,
      d.content,
      d.source_updated_at,
      d.source_author_id,
      d.last_updated_source_user_id
    FROM 
      documents d
    JOIN 
      document_user_access dua ON d.id = dua.document_id
    WHERE 
      dua.user_id = p_user_id  
      AND d.source_updated_at >= time_interval
      AND NOT EXISTS (
        -- Exclude documents that already have action items created after the document was last updated
        SELECT 1 FROM document_action_items dai
        JOIN document_action_item_relations dair ON dai.id = dair.action_item_id
        WHERE dair.document_id = d.id
        AND dai.user_id = p_user_id 
        AND dai.created_at >= d.source_updated_at
      )
  )
  SELECT 
    ud.id
  FROM 
    user_documents ud
  WHERE
    -- Check for user mentions in content or source IDs
    (
      -- Source author or last updater matches any source ID
      (cardinality(source_ids) > 0 AND (
        ud.source_author_id = ANY(source_ids)
        OR ud.last_updated_source_user_id = ANY(source_ids)
      ))
      -- Content contains any mentions
      OR (cardinality(mentions) > 0 AND (
        EXISTS (
          SELECT 1 
          FROM unnest(mentions) mention 
          WHERE ud.content ILIKE '%' || mention || '%'
        )
      ))
    );
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION public.find_action_item_documents(UUID, TEXT[], TEXT[], INTEGER) TO service_role;