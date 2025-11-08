-- Brain Dump Canvas - Database Schema
-- PostgreSQL with pgvector extension
-- Version: 1.1
-- Last Updated: November 7, 2025

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector operations for embeddings
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- TABLES
-- ============================================

-- Brain Dumps (Workspaces)
-- Each brain dump is an isolated canvas with its own ideas and edges
CREATE TABLE brain_dumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL DEFAULT 'Untitled Dump',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  
  -- Viewport state (restored when user opens this brain dump)
  viewport_x FLOAT NOT NULL DEFAULT 0,
  viewport_y FLOAT NOT NULL DEFAULT 0,
  viewport_zoom FLOAT NOT NULL DEFAULT 1.0,
  
  -- Constraints
  CONSTRAINT brain_dumps_name_length CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
  CONSTRAINT brain_dumps_zoom_range CHECK (viewport_zoom >= 0.1 AND viewport_zoom <= 3.0)
);

-- Ideas (Nodes on Canvas)
-- Each idea belongs to one brain dump and can have attachments and edges
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_dump_id UUID NOT NULL REFERENCES brain_dumps(id) ON DELETE CASCADE,
  
  -- Content
  text TEXT NOT NULL,
  summary TEXT,
  
  -- Position on canvas
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT NOT NULL DEFAULT 200,
  height FLOAT NOT NULL DEFAULT 100,
  
  -- Idea type: 'text' for regular ideas, 'attachment' for file-based ideas
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  
  -- Processing state
  state VARCHAR(20) NOT NULL DEFAULT 'generating',
  
  -- Session tracking (for temporal grouping)
  session_id UUID,
  
  -- AI-generated embedding for semantic search
  embedding vector(1536),
  
  -- Flexible metadata storage
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ideas_text_not_empty CHECK (LENGTH(TRIM(text)) > 0),
  CONSTRAINT ideas_type_valid CHECK (type IN ('text', 'attachment')),
  CONSTRAINT ideas_state_valid CHECK (state IN ('generating', 'ready', 'error')),
  CONSTRAINT ideas_dimensions_positive CHECK (width > 0 AND height > 0)
);

-- Edges (Relationships between Ideas)
-- Represents parent-child relationships with labeled types
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_dump_id UUID NOT NULL REFERENCES brain_dumps(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  
  -- Relationship type (e.g., "depends_on", "blocks", "related_to")
  type VARCHAR(50) NOT NULL DEFAULT 'related_to',
  
  -- Optional note about the relationship
  note TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT edges_unique_relationship UNIQUE(parent_id, child_id),
  CONSTRAINT edges_no_self_reference CHECK (parent_id != child_id)
);

-- Edge Types (User-customizable relationship types)
-- Default types are seeded, users can add custom types
CREATE TABLE edge_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT edge_types_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Attachments (Files for Attachment Ideas)  
-- Links attachment ideas to their file storage (Supabase Storage or base64)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  
  -- Attachment type (image, pdf, url, file)
  type VARCHAR(20) NOT NULL,
  
  -- Storage URL (Supabase Storage public URL or base64 data URL)
  url TEXT NOT NULL,
  
  -- Original filename (for downloads and display)
  filename TEXT,
  
  -- File metadata: {fileSize, mimeType, width?, height?, thumbnailUrl?, isBase64?}
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT attachments_type_valid CHECK (type IN ('image', 'pdf', 'url', 'file', 'text')),
  CONSTRAINT attachments_url_not_empty CHECK (LENGTH(TRIM(url)) > 0)
);

-- AI Operations Log (for monitoring and cost tracking)
-- Tracks all AI operations (summarization, embeddings)
CREATE TABLE ai_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Operation details
  type VARCHAR(50) NOT NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  model VARCHAR(100),
  
  -- Performance metrics
  duration INTEGER,  -- milliseconds
  success BOOLEAN NOT NULL,
  error TEXT,
  
  -- Cost tracking
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost DECIMAL(10, 6),
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT ai_operations_type_valid CHECK (type IN ('summarization', 'embedding'))
);

-- ============================================
-- INDEXES
-- ============================================

-- Brain Dumps
CREATE INDEX idx_brain_dumps_archived ON brain_dumps(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_brain_dumps_created ON brain_dumps(created_at DESC);

-- Ideas
CREATE INDEX idx_ideas_brain_dump ON ideas(brain_dump_id);
CREATE INDEX idx_ideas_state ON ideas(state);
CREATE INDEX idx_ideas_type ON ideas(type);
CREATE INDEX idx_ideas_session ON ideas(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ideas_created ON ideas(created_at DESC);

-- Spatial index for proximity queries
CREATE INDEX idx_ideas_spatial ON ideas USING gist (point(position_x, position_y));

-- Vector index for similarity search (IVFFlat algorithm)
-- Lists parameter should be sqrt(total_rows) for optimal performance
-- Start with 100, adjust as data grows
CREATE INDEX idx_ideas_embedding ON ideas 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;

-- Edges
CREATE INDEX idx_edges_brain_dump ON edges(brain_dump_id);
CREATE INDEX idx_edges_parent ON edges(parent_id);
CREATE INDEX idx_edges_child ON edges(child_id);
CREATE INDEX idx_edges_type ON edges(type);

-- Attachments
CREATE INDEX idx_attachments_idea ON attachments(idea_id);
CREATE INDEX idx_attachments_type ON attachments(type);

-- AI Operations
CREATE INDEX idx_ai_operations_idea ON ai_operations(idea_id) WHERE idea_id IS NOT NULL;
CREATE INDEX idx_ai_operations_type ON ai_operations(type);
CREATE INDEX idx_ai_operations_created ON ai_operations(created_at DESC);
CREATE INDEX idx_ai_operations_success ON ai_operations(success);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get all descendants of an idea (recursive)
CREATE OR REPLACE FUNCTION get_descendants(idea_id UUID)
RETURNS TABLE(id UUID, depth INT) AS $$
  WITH RECURSIVE descendants AS (
    -- Base case: direct children
    SELECT child_id AS id, 1 AS depth
    FROM edges
    WHERE parent_id = idea_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT e.child_id, d.depth + 1
    FROM edges e
    INNER JOIN descendants d ON e.parent_id = d.id
    WHERE d.depth < 10  -- Prevent infinite recursion
  )
  SELECT * FROM descendants;
$$ LANGUAGE SQL STABLE;

-- Get all ancestors of an idea (recursive)
CREATE OR REPLACE FUNCTION get_ancestors(idea_id UUID)
RETURNS TABLE(id UUID, depth INT) AS $$
  WITH RECURSIVE ancestors AS (
    -- Base case: direct parent
    SELECT parent_id AS id, 1 AS depth
    FROM edges
    WHERE child_id = idea_id
    
    UNION ALL
    
    -- Recursive case: parents of parents
    SELECT e.parent_id, a.depth + 1
    FROM edges e
    INNER JOIN ancestors a ON e.child_id = a.id
    WHERE a.depth < 10  -- Prevent infinite recursion
  )
  SELECT * FROM ancestors;
$$ LANGUAGE SQL STABLE;

-- Check if adding an edge would create a cycle
CREATE OR REPLACE FUNCTION would_create_cycle(
  new_parent_id UUID,
  new_child_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if new_parent_id is a descendant of new_child_id
  RETURN EXISTS (
    SELECT 1 FROM get_descendants(new_child_id)
    WHERE id = new_parent_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get parent count for an idea
CREATE OR REPLACE FUNCTION get_parent_count(idea_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM edges
  WHERE child_id = idea_id;
$$ LANGUAGE SQL STABLE;

-- Get child count for an idea
CREATE OR REPLACE FUNCTION get_child_count(idea_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM edges
  WHERE parent_id = idea_id;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on brain_dumps
CREATE TRIGGER brain_dumps_updated_at
  BEFORE UPDATE ON brain_dumps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on ideas
CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on edges
CREATE TRIGGER edges_updated_at
  BEFORE UPDATE ON edges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default edge types
INSERT INTO edge_types (name, is_default) VALUES
  ('related_to', true),
  ('prerequisite_for', true),
  ('inspired_by', true),
  ('blocks', true),
  ('similar_to', true),
  ('depends_on', true)
ON CONFLICT (name) DO NOTHING;

-- Create demo brain dump (optional, for first-time users)
INSERT INTO brain_dumps (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Dump',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VIEWS (Optional, for convenience)
-- ============================================

-- View: Ideas with parent/child counts
CREATE OR REPLACE VIEW ideas_with_counts AS
SELECT 
  i.*,
  COALESCE(parent_counts.count, 0) AS parent_count,
  COALESCE(child_counts.count, 0) AS child_count
FROM ideas i
LEFT JOIN (
  SELECT child_id, COUNT(*) AS count
  FROM edges
  GROUP BY child_id
) parent_counts ON i.id = parent_counts.child_id
LEFT JOIN (
  SELECT parent_id, COUNT(*) AS count
  FROM edges
  GROUP BY parent_id
) child_counts ON i.id = child_counts.parent_id;

-- View: Brain dumps with idea counts
CREATE OR REPLACE VIEW brain_dumps_with_counts AS
SELECT 
  bd.*,
  COALESCE(idea_counts.count, 0) AS idea_count
FROM brain_dumps bd
LEFT JOIN (
  SELECT brain_dump_id, COUNT(*) AS count
  FROM ideas
  GROUP BY brain_dump_id
) idea_counts ON bd.id = idea_counts.brain_dump_id;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE brain_dumps IS 'Isolated workspaces containing ideas and edges';
COMMENT ON TABLE ideas IS 'Individual thought nodes positioned on the canvas';
COMMENT ON TABLE edges IS 'Parent-child relationships between ideas';
COMMENT ON TABLE edge_types IS 'User-customizable relationship type definitions';
COMMENT ON TABLE attachments IS 'File storage references for attachment ideas (Supabase Storage + base64 fallback)';
COMMENT ON TABLE ai_operations IS 'Log of all AI operations for monitoring and cost tracking';

COMMENT ON COLUMN ideas.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic search';
COMMENT ON COLUMN ideas.metadata IS 'Flexible JSON storage for word count, URLs, file metadata for attachment ideas, etc.';
COMMENT ON COLUMN ideas.type IS 'Idea type: text (regular text ideas) or attachment (file-based ideas)';
COMMENT ON COLUMN attachments.metadata IS 'File metadata: {fileSize, mimeType, width, height, thumbnailUrl, isBase64}';
COMMENT ON COLUMN ideas.state IS 'Processing state: generating (AI processing), ready (complete), error (failed)';
COMMENT ON COLUMN ideas.session_id IS 'Groups ideas created in the same session for temporal analysis';

COMMENT ON FUNCTION get_descendants IS 'Recursively find all child ideas (max depth 10)';
COMMENT ON FUNCTION get_ancestors IS 'Recursively find all parent ideas (max depth 10)';
COMMENT ON FUNCTION would_create_cycle IS 'Check if adding an edge would create a circular dependency';

-- ============================================
-- GRANTS (Adjust based on your auth setup)
-- ============================================

-- For now, assuming single-user or service role access
-- Add user-level permissions when implementing authentication

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- MAINTENANCE
-- ============================================

-- Vacuum and analyze tables regularly
-- Run this periodically or set up as a cron job

-- VACUUM ANALYZE brain_dumps;
-- VACUUM ANALYZE ideas;
-- VACUUM ANALYZE edges;
-- VACUUM ANALYZE attachments;

-- Update vector index statistics when data grows
-- Rebuild index if performance degrades

-- DROP INDEX idx_ideas_embedding;
-- CREATE INDEX idx_ideas_embedding ON ideas 
--   USING ivfflat (embedding vector_cosine_ops) 
--   WITH (lists = 200);  -- Increase lists as data grows

-- ============================================
-- NOTES
-- ============================================

-- 1. pgvector IVFFlat Index:
--    - Lists parameter should be sqrt(total_rows) for optimal performance
--    - Start with 100 for <10K ideas
--    - Increase to 200 for 10K-40K ideas
--    - Increase to 500 for 40K-250K ideas

-- 2. Embedding Dimensions:
--    - Using 1536 (OpenAI text-embedding-3-small default)
--    - Can reduce to 512 or 256 for smaller storage/faster queries
--    - Trade-off: smaller dimensions = less accurate similarity

-- 3. Circular Dependency Prevention:
--    - would_create_cycle() function checks before adding edges
--    - Call this in your API before inserting edges
--    - Max depth is 10 to prevent infinite recursion

-- 4. Soft Delete:
--    - Brain dumps use archived_at for soft delete
--    - Ideas and edges are hard deleted (CASCADE)
--    - Implement trash/recovery system in application layer

-- 5. Cost Tracking:
--    - ai_operations table tracks all AI API calls
--    - Use for monitoring, alerting, and cost analysis
--    - Query by date range to get daily/monthly costs

