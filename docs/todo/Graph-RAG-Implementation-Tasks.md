# Graph RAG Intelligence - Implementation Tasks
**Detailed Technical Task Breakdown**

**Date Created**: November 8, 2025  
**Version**: 1.0

---

## 🎯 PHASE 1: Vector Search Foundation (Weeks 1-2)

### Task 1.1: Create Database Functions for Similarity Search
**Priority**: Critical  
**Estimated Time**: 4 hours

**Subtasks**:
1. Create `match_ideas()` function for basic vector similarity search
2. Create `match_ideas_with_context()` for graph-aware search
3. Add proper error handling and parameter validation
4. Test with sample data

**SQL Implementation**:
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_vector_search_functions.sql

-- Basic similarity search
CREATE OR REPLACE FUNCTION match_ideas(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  brain_dump_filter text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  content text,
  summary text,
  similarity float,
  x float,
  y float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.content,
    i.summary,
    1 - (i.embedding <=> query_embedding) as similarity,
    i.x,
    i.y,
    i.created_at
  FROM ideas i
  WHERE 
    i.embedding IS NOT NULL
    AND (brain_dump_filter IS NULL OR i.brain_dump_id = brain_dump_filter)
    AND 1 - (i.embedding <=> query_embedding) >= match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Graph-aware similarity search (includes connected ideas)
CREATE OR REPLACE FUNCTION match_ideas_with_context(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  brain_dump_filter text DEFAULT NULL,
  include_connected boolean DEFAULT true,
  max_depth int DEFAULT 1
)
RETURNS TABLE (
  id text,
  content text,
  similarity float,
  is_direct_match boolean,
  connection_path text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Implementation will traverse edges to include connected ideas
  -- This is a placeholder for the complex graph traversal logic
  RETURN QUERY
  WITH direct_matches AS (
    SELECT * FROM match_ideas(
      query_embedding, 
      match_threshold, 
      match_count, 
      brain_dump_filter
    )
  ),
  connected_ideas AS (
    SELECT DISTINCT
      i.id,
      i.content,
      0.0 as similarity, -- Will calculate based on path
      false as is_direct_match,
      ARRAY[dm.id, i.id] as connection_path
    FROM direct_matches dm
    JOIN edges e ON (e.source_id = dm.id OR e.target_id = dm.id)
    JOIN ideas i ON (i.id = e.source_id OR i.id = e.target_id)
    WHERE i.id != dm.id AND include_connected = true
  )
  SELECT 
    dm.id,
    dm.content,
    dm.similarity,
    true as is_direct_match,
    ARRAY[dm.id] as connection_path
  FROM direct_matches dm
  UNION ALL
  SELECT * FROM connected_ideas
  ORDER BY is_direct_match DESC, similarity DESC;
END;
$$;
```

**Testing**:
```sql
-- Test basic search
SELECT * FROM match_ideas(
  (SELECT embedding FROM ideas WHERE id = 'test-id-1'),
  0.7,
  5,
  'braindump-1'
);

-- Test graph-aware search
SELECT * FROM match_ideas_with_context(
  (SELECT embedding FROM ideas WHERE id = 'test-id-1'),
  0.7,
  5,
  'braindump-1',
  true,
  1
);
```

---

### Task 1.2: Build Semantic Search API Endpoint
**Priority**: Critical  
**Estimated Time**: 6 hours

**Subtasks**:
1. Create `/api/search` endpoint with semantic mode
2. Add query embedding generation
3. Implement result ranking and filtering
4. Add error handling and validation
5. Write API tests

**TypeScript Implementation**:
```typescript
// File: src/app/api/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/openai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') || 'keyword'; // 'keyword' | 'semantic' | 'hybrid'
    const brainDumpId = searchParams.get('brainDumpId');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeConnected = searchParams.get('includeConnected') === 'true';

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    let results = [];

    if (mode === 'semantic' || mode === 'hybrid') {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query);

      // Call vector search function
      const { data: semanticResults, error } = await supabase.rpc(
        includeConnected ? 'match_ideas_with_context' : 'match_ideas',
        {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit,
          brain_dump_filter: brainDumpId,
          include_connected: includeConnected,
          max_depth: 1
        }
      );

      if (error) throw error;
      results = semanticResults || [];
    }

    if (mode === 'keyword' || mode === 'hybrid') {
      // Traditional keyword search
      let keywordQuery = supabase
        .from('ideas')
        .select('*')
        .ilike('content', `%${query}%`);

      if (brainDumpId) {
        keywordQuery = keywordQuery.eq('brain_dump_id', brainDumpId);
      }

      const { data: keywordResults, error } = await keywordQuery.limit(limit);

      if (error) throw error;

      // Merge with semantic results if hybrid mode
      if (mode === 'hybrid') {
        // Combine and deduplicate results
        const resultMap = new Map();
        results.forEach(r => resultMap.set(r.id, r));
        keywordResults?.forEach(r => {
          if (!resultMap.has(r.id)) {
            resultMap.set(r.id, { ...r, similarity: 0.5 });
          }
        });
        results = Array.from(resultMap.values());
      } else {
        results = keywordResults || [];
      }
    }

    return NextResponse.json({
      data: results,
      count: results.length,
      mode,
      query
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

---

### Task 1.3: Build "Find Similar Ideas" Feature
**Priority**: High  
**Estimated Time**: 4 hours

**Subtasks**:
1. Enhance existing `/api/ideas/[id]/similar` endpoint
2. Add UI component for similar ideas panel
3. Add visual highlighting on canvas
4. Implement "Connect to similar" quick action

**API Enhancement**:
```typescript
// File: src/app/api/ideas/[id]/similar/route.ts
// (Already exists, enhance it)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const includeConnected = searchParams.get('includeConnected') === 'true';

    const supabase = createServerClient();
    
    // Get source idea with embedding
    const { data: sourceIdea, error: sourceError } = await supabase
      .from('ideas')
      .select('id, content, embedding, brain_dump_id')
      .eq('id', params.id)
      .single();

    if (sourceError || !sourceIdea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    if (!sourceIdea.embedding) {
      return NextResponse.json(
        { error: 'Source idea has no embedding' },
        { status: 400 }
      );
    }

    // Use the new function
    const { data, error } = await supabase.rpc(
      includeConnected ? 'match_ideas_with_context' : 'match_ideas',
      {
        query_embedding: sourceIdea.embedding,
        match_threshold: threshold,
        match_count: limit + 1,
        brain_dump_filter: sourceIdea.brain_dump_id,
        include_connected: includeConnected
      }
    );

    if (error) throw error;

    // Filter out source idea
    const similarIdeas = (data || [])
      .filter((idea: any) => idea.id !== params.id)
      .slice(0, limit);

    return NextResponse.json({
      data: similarIdeas,
      count: similarIdeas.length,
      source_idea: {
        id: sourceIdea.id,
        content: sourceIdea.content
      }
    });
  } catch (error) {
    console.error('Error finding similar ideas:', error);
    return NextResponse.json(
      { error: 'Failed to find similar ideas' },
      { status: 500 }
    );
  }
}
```

**UI Component**:
```typescript
// File: src/components/SimilarIdeasPanel.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SimilarIdea {
  id: string;
  content: string;
  similarity: number;
  is_direct_match?: boolean;
}

interface SimilarIdeasPanelProps {
  ideaId: string;
  onSelectIdea: (id: string) => void;
  onCreateConnection: (sourceId: string, targetId: string) => void;
}

export function SimilarIdeasPanel({ 
  ideaId, 
  onSelectIdea, 
  onCreateConnection 
}: SimilarIdeasPanelProps) {
  const [similarIdeas, setSimilarIdeas] = useState<SimilarIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimilarIdeas();
  }, [ideaId]);

  async function fetchSimilarIdeas() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ideas/${ideaId}/similar?threshold=0.7&limit=5&includeConnected=true`
      );
      const data = await response.json();
      setSimilarIdeas(data.data || []);
    } catch (error) {
      console.error('Failed to fetch similar ideas:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading similar ideas...</div>;
  }

  if (similarIdeas.length === 0) {
    return <div className="p-4 text-gray-500">No similar ideas found</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-sm">Similar Ideas</h3>
      {similarIdeas.map((idea) => (
        <div 
          key={idea.id} 
          className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSelectIdea(idea.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm flex-1">{idea.content}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {Math.round(idea.similarity * 100)}%
            </span>
          </div>
          {idea.is_direct_match === false && (
            <span className="text-xs text-gray-500 mt-1 block">
              Via connection
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full"
            onClick={(e) => {
              e.stopPropagation();
              onCreateConnection(ideaId, idea.id);
            }}
          >
            Connect
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

### Task 1.4: Fix Embedding Generation
**Priority**: Critical  
**Estimated Time**: 3 hours

**Problem**: Current test ideas don't have embeddings generated

**Subtasks**:
1. Debug why background jobs aren't running
2. Ensure OpenAI API key is configured
3. Test embedding generation end-to-end
4. Backfill embeddings for existing ideas

**Implementation**:
```typescript
// File: src/lib/embedding-backfill.ts

import { createServerClient } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/openai';

export async function backfillEmbeddings(brainDumpId?: string) {
  const supabase = createServerClient();
  
  // Get ideas without embeddings
  let query = supabase
    .from('ideas')
    .select('id, content')
    .is('embedding', null);
    
  if (brainDumpId) {
    query = query.eq('brain_dump_id', brainDumpId);
  }
  
  const { data: ideas, error } = await query;
  
  if (error) throw error;
  
  console.log(`Found ${ideas?.length || 0} ideas without embeddings`);
  
  // Generate embeddings in batches
  for (const idea of ideas || []) {
    try {
      console.log(`Generating embedding for idea ${idea.id}...`);
      const embedding = await generateEmbedding(idea.content);
      
      const { error: updateError } = await supabase
        .from('ideas')
        .update({ embedding })
        .eq('id', idea.id);
        
      if (updateError) {
        console.error(`Failed to update idea ${idea.id}:`, updateError);
      } else {
        console.log(`✓ Updated idea ${idea.id}`);
      }
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate embedding for idea ${idea.id}:`, error);
    }
  }
  
  console.log('Backfill complete!');
}

// CLI script
if (require.main === module) {
  const brainDumpId = process.argv[2];
  backfillEmbeddings(brainDumpId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}
```

**Usage**:
```bash
# Backfill all ideas
npx tsx src/lib/embedding-backfill.ts

# Backfill specific brain dump
npx tsx src/lib/embedding-backfill.ts braindump-1761984998583-0.07459156689600321
```

---

### Task 1.5: Add Search UI to Canvas
**Priority**: High  
**Estimated Time**: 4 hours

**Subtasks**:
1. Add search bar to CanvasHeader
2. Implement mode toggle (keyword/semantic/hybrid)
3. Add visual highlighting for search results
4. Implement "jump to result" functionality

**UI Implementation**:
```typescript
// File: src/components/SemanticSearchBar.tsx

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchResult {
  id: string;
  content: string;
  similarity?: number;
  x: number;
  y: number;
}

interface SemanticSearchBarProps {
  brainDumpId: string;
  onResultsFound: (results: SearchResult[]) => void;
  onResultSelected: (result: SearchResult) => void;
}

export function SemanticSearchBar({
  brainDumpId,
  onResultsFound,
  onResultSelected
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic' | 'hybrid'>('semantic');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&mode=${mode}&brainDumpId=${brainDumpId}&threshold=0.6&limit=20`
      );
      const data = await response.json();
      setResults(data.data || []);
      setShowResults(true);
      onResultsFound(data.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search ideas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Select value={mode} onValueChange={(v: any) => setMode(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Keyword</SelectItem>
            <SelectItem value="semantic">Semantic</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {results.map((result) => (
            <div
              key={result.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => {
                onResultSelected(result);
                setShowResults(false);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1">{result.content}</p>
                {result.similarity !== undefined && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {Math.round(result.similarity * 100)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 PHASE 2: Enhanced Embeddings (Weeks 3-4)

### Task 2.1: Add Context Embedding Column
**Priority**: High  
**Estimated Time**: 2 hours

**SQL Migration**:
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_context_embedding.sql

-- Add context embedding column
ALTER TABLE ideas ADD COLUMN context_embedding vector(1536);

-- Add index for context embedding
CREATE INDEX idx_ideas_context_embedding ON ideas 
  USING ivfflat (context_embedding vector_cosine_ops) 
  WITH (lists = 100)
  WHERE context_embedding IS NOT NULL;

-- Add structural features column for graph-based features
ALTER TABLE ideas ADD COLUMN structural_features jsonb DEFAULT '{}';

COMMENT ON COLUMN ideas.context_embedding IS 'Embedding that includes connected ideas and metadata for richer context';
COMMENT ON COLUMN ideas.structural_features IS 'Graph-based features: degree centrality, betweenness, clustering coefficient, etc.';
```

---

### Task 2.2: Build Context Embedding Generator
**Priority**: High  
**Estimated Time**: 6 hours

**Implementation**:
```typescript
// File: src/lib/context-embedding.ts

import { createServerClient } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/openai';

interface IdeaContext {
  mainContent: string;
  connectedIdeas: {
    content: string;
    relationship: string;
    direction: 'parent' | 'child';
  }[];
  metadata: {
    sessionId?: string;
    createdAt: string;
    quadrant: string;
  };
}

export async function buildContextualText(ideaId: string): Promise<string> {
  const supabase = createServerClient();
  
  // Get main idea
  const { data: idea, error: ideaError } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', ideaId)
    .single();
    
  if (ideaError || !idea) throw new Error('Idea not found');
  
  // Get connected ideas (parents and children)
  const { data: edges, error: edgesError } = await supabase
    .from('edges')
    .select(`
      *,
      source:ideas!edges_source_id_fkey(id, content),
      target:ideas!edges_target_id_fkey(id, content),
      type:edge_types!edges_relationship_type_fkey(name)
    `)
    .or(`source_id.eq.${ideaId},target_id.eq.${ideaId}`);
    
  if (edgesError) throw edgesError;
  
  // Build contextual text
  const parts: string[] = [];
  
  // Main content
  parts.push(`Main idea: ${idea.content}`);
  
  // Summary if available
  if (idea.summary) {
    parts.push(`Summary: ${idea.summary}`);
  }
  
  // Connected ideas
  if (edges && edges.length > 0) {
    const parents = edges
      .filter((e: any) => e.target_id === ideaId)
      .map((e: any) => `${e.source.content} (${e.type.name})`);
      
    const children = edges
      .filter((e: any) => e.source_id === ideaId)
      .map((e: any) => `${e.target.content} (${e.type.name})`);
      
    if (parents.length > 0) {
      parts.push(`Building on: ${parents.join(', ')}`);
    }
    
    if (children.length > 0) {
      parts.push(`Leading to: ${children.join(', ')}`);
    }
  }
  
  // Spatial context
  const quadrant = getQuadrant(idea.x, idea.y);
  parts.push(`Location: ${quadrant}`);
  
  // Temporal context
  const createdDate = new Date(idea.created_at).toLocaleDateString();
  parts.push(`Created: ${createdDate}`);
  
  return parts.join('\n');
}

function getQuadrant(x: number, y: number): string {
  // Assuming canvas center is around (500, 500)
  const centerX = 500;
  const centerY = 500;
  
  if (x < centerX && y < centerY) return 'top-left';
  if (x >= centerX && y < centerY) return 'top-right';
  if (x < centerX && y >= centerY) return 'bottom-left';
  return 'bottom-right';
}

export async function generateContextEmbedding(ideaId: string): Promise<number[]> {
  const contextText = await buildContextualText(ideaId);
  return await generateEmbedding(contextText);
}

export async function updateIdeaWithContextEmbedding(ideaId: string): Promise<void> {
  const supabase = createServerClient();
  
  try {
    const contextEmbedding = await generateContextEmbedding(ideaId);
    
    const { error } = await supabase
      .from('ideas')
      .update({ context_embedding: contextEmbedding })
      .eq('id', ideaId);
      
    if (error) throw error;
    
    console.log(`✓ Updated context embedding for idea ${ideaId}`);
  } catch (error) {
    console.error(`Failed to update context embedding for idea ${ideaId}:`, error);
    throw error;
  }
}
```

---

### Task 2.3: Create Similarity Cache Table
**Priority**: Medium  
**Estimated Time**: 3 hours

**SQL Migration**:
```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_similarity_cache.sql

-- Cache for expensive similarity calculations
CREATE TABLE idea_similarities (
  idea1_id text REFERENCES ideas(id) ON DELETE CASCADE,
  idea2_id text REFERENCES ideas(id) ON DELETE CASCADE,
  content_similarity float NOT NULL,
  context_similarity float,
  structural_similarity float,
  combined_score float NOT NULL,
  calculated_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (idea1_id, idea2_id),
  CONSTRAINT idea_similarities_ordered CHECK (idea1_id < idea2_id)
);

-- Indexes
CREATE INDEX idx_idea_similarities_idea1 ON idea_similarities(idea1_id);
CREATE INDEX idx_idea_similarities_idea2 ON idea_similarities(idea2_id);
CREATE INDEX idx_idea_similarities_score ON idea_similarities(combined_score DESC);

-- Function to get or calculate similarity
CREATE OR REPLACE FUNCTION get_similarity(
  id1 text,
  id2 text,
  recalculate boolean DEFAULT false
)
RETURNS float
LANGUAGE plpgsql
AS $$
DECLARE
  cached_score float;
  ordered_id1 text;
  ordered_id2 text;
BEGIN
  -- Ensure consistent ordering
  IF id1 < id2 THEN
    ordered_id1 := id1;
    ordered_id2 := id2;
  ELSE
    ordered_id1 := id2;
    ordered_id2 := id1;
  END IF;
  
  -- Check cache
  IF NOT recalculate THEN
    SELECT combined_score INTO cached_score
    FROM idea_similarities
    WHERE idea1_id = ordered_id1 AND idea2_id = ordered_id2;
    
    IF FOUND THEN
      RETURN cached_score;
    END IF;
  END IF;
  
  -- Calculate and cache
  -- (Implementation would calculate similarity and insert into cache)
  -- For now, return NULL to indicate not cached
  RETURN NULL;
END;
$$;

COMMENT ON TABLE idea_similarities IS 'Cached similarity scores between idea pairs to avoid expensive recalculations';
```

---

## 🎯 PHASE 3: Intelligent Layout (Weeks 5-6)

### Task 3.1: Implement Force-Directed Layout Algorithm
**Priority**: High  
**Estimated Time**: 8 hours

**Implementation**:
```typescript
// File: src/lib/layout/force-directed.ts

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number; // velocity
  vy: number;
  fixed?: boolean; // user-anchored nodes
}

interface Edge {
  source: string;
  target: string;
  strength: number; // based on relationship type
}

interface LayoutOptions {
  iterations?: number;
  similarityWeight?: number;
  edgeWeight?: number;
  repulsionStrength?: number;
  attractionStrength?: number;
  preserveAnchors?: boolean;
}

export class ForceDirectedLayout {
  private nodes: Map<string, Node>;
  private edges: Edge[];
  private similarities: Map<string, number>; // pair -> similarity score
  
  constructor(
    nodes: Node[],
    edges: Edge[],
    similarities: Map<string, number>
  ) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
    this.edges = edges;
    this.similarities = similarities;
  }
  
  compute(options: LayoutOptions = {}): Map<string, {x: number, y: number}> {
    const {
      iterations = 100,
      similarityWeight = 0.5,
      edgeWeight = 0.3,
      repulsionStrength = 1000,
      attractionStrength = 0.1,
      preserveAnchors = true
    } = options;
    
    // Run simulation
    for (let i = 0; i < iterations; i++) {
      const alpha = 1 - (i / iterations); // cooling factor
      
      // Apply forces
      this.applyRepulsion(repulsionStrength * alpha);
      this.applyEdgeAttraction(edgeWeight * alpha * attractionStrength);
      this.applySimilarityAttraction(similarityWeight * alpha * attractionStrength);
      this.applyBoundary();
      
      // Update positions
      this.updatePositions(alpha, preserveAnchors);
    }
    
    // Return final positions
    const positions = new Map<string, {x: number, y: number}>();
    this.nodes.forEach((node, id) => {
      positions.set(id, { x: node.x, y: node.y });
    });
    
    return positions;
  }
  
  private applyRepulsion(strength: number) {
    // All nodes repel each other
    const nodeArray = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const n1 = nodeArray[i];
        const n2 = nodeArray[j];
        
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = strength / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;
      }
    }
  }
  
  private applyEdgeAttraction(strength: number) {
    // Connected nodes attract each other
    for (const edge of this.edges) {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);
      
      if (!source || !target) continue;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      const force = distance * strength * edge.strength;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
  }
  
  private applySimilarityAttraction(strength: number) {
    // Similar nodes attract each other
    this.similarities.forEach((similarity, pairKey) => {
      const [id1, id2] = pairKey.split('|');
      const n1 = this.nodes.get(id1);
      const n2 = this.nodes.get(id2);
      
      if (!n1 || !n2) return;
      
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // Attraction proportional to similarity
      const force = distance * strength * similarity;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      n1.vx += fx;
      n1.vy += fy;
      n2.vx -= fx;
      n2.vy -= fy;
    });
  }
  
  private applyBoundary() {
    // Keep nodes within canvas bounds
    const margin = 100;
    const minX = margin;
    const minY = margin;
    const maxX = 2000 - margin;
    const maxY = 2000 - margin;
    
    this.nodes.forEach(node => {
      if (node.x < minX) node.vx += (minX - node.x) * 0.1;
      if (node.x > maxX) node.vx += (maxX - node.x) * 0.1;
      if (node.y < minY) node.vy += (minY - node.y) * 0.1;
      if (node.y > maxY) node.vy += (maxY - node.y) * 0.1;
    });
  }
  
  private updatePositions(alpha: number, preserveAnchors: boolean) {
    this.nodes.forEach(node => {
      // Skip fixed/anchored nodes
      if (preserveAnchors && node.fixed) return;
      
      // Update position
      node.x += node.vx * alpha;
      node.y += node.vy * alpha;
      
      // Apply damping
      node.vx *= 0.9;
      node.vy *= 0.9;
    });
  }
}
```

---

### Task 3.2: Create Layout API Endpoint
**Priority**: High  
**Estimated Time**: 4 hours

**Implementation**:
```typescript
// File: src/app/api/brain-dumps/[id]/layout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ForceDirectedLayout } from '@/lib/layout/force-directed';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { method = 'force-directed', options = {} } = body;
    
    const supabase = createServerClient();
    
    // Get all ideas and edges for this brain dump
    const [ideasResult, edgesResult] = await Promise.all([
      supabase
        .from('ideas')
        .select('id, x, y, embedding')
        .eq('brain_dump_id', params.id),
      supabase
        .from('edges')
        .select('source_id, target_id, relationship_type')
        .eq('brain_dump_id', params.id)
    ]);
    
    if (ideasResult.error) throw ideasResult.error;
    if (edgesResult.error) throw edgesResult.error;
    
    const ideas = ideasResult.data || [];
    const edges = edgesResult.data || [];
    
    // Calculate similarities between all idea pairs
    const similarities = new Map<string, number>();
    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const idea1 = ideas[i];
        const idea2 = ideas[j];
        
        if (idea1.embedding && idea2.embedding) {
          const similarity = cosineSimilarity(idea1.embedding, idea2.embedding);
          if (similarity > 0.6) { // Only store significant similarities
            similarities.set(`${idea1.id}|${idea2.id}`, similarity);
          }
        }
      }
    }
    
    // Run layout algorithm
    let newPositions: Map<string, {x: number, y: number}>;
    
    if (method === 'force-directed') {
      const nodes = ideas.map(idea => ({
        id: idea.id,
        x: idea.x,
        y: idea.y,
        vx: 0,
        vy: 0,
        fixed: options.preserveAnchors && isUserPositioned(idea)
      }));
      
      const layoutEdges = edges.map(edge => ({
        source: edge.source_id,
        target: edge.target_id,
        strength: 1.0 // Could vary by relationship_type
      }));
      
      const layout = new ForceDirectedLayout(nodes, layoutEdges, similarities);
      newPositions = layout.compute(options);
    } else {
      throw new Error(`Unsupported layout method: ${method}`);
    }
    
    // Prepare updates
    const updates = Array.from(newPositions.entries()).map(([id, pos]) => ({
      id,
      x: pos.x,
      y: pos.y
    }));
    
    return NextResponse.json({
      success: true,
      updates,
      method,
      stats: {
        ideasProcessed: ideas.length,
        edgesProcessed: edges.length,
        similaritiesFound: similarities.size
      }
    });
  } catch (error) {
    console.error('Layout calculation failed:', error);
    return NextResponse.json(
      { error: 'Layout calculation failed' },
      { status: 500 }
    );
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function isUserPositioned(idea: any): boolean {
  // Heuristic: if idea hasn't moved in last 5 minutes, consider it user-positioned
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(idea.updated_at) < fiveMinutesAgo;
}
```

---

## 📝 Summary of All Tasks

### Phase 1 (Weeks 1-2): Vector Search Foundation
- ✅ Task 1.1: Database functions for similarity search
- ✅ Task 1.2: Semantic search API endpoint
- ✅ Task 1.3: "Find similar ideas" feature
- ✅ Task 1.4: Fix embedding generation
- ✅ Task 1.5: Search UI components

### Phase 2 (Weeks 3-4): Enhanced Embeddings
- ✅ Task 2.1: Add context embedding column
- ✅ Task 2.2: Context embedding generator
- ✅ Task 2.3: Similarity cache table
- Task 2.4: Structural features calculation
- Task 2.5: Backfill context embeddings

### Phase 3 (Weeks 5-6): Intelligent Layout
- ✅ Task 3.1: Force-directed layout algorithm
- ✅ Task 3.2: Layout API endpoint
- Task 3.3: Clustering algorithm (DBSCAN)
- Task 3.4: Layout UI controls
- Task 3.5: Animation system

### Phase 4 (Weeks 7-8): Cluster Detection
- Task 4.1: Cluster detection algorithm
- Task 4.2: Cluster database schema
- Task 4.3: AI cluster naming
- Task 4.4: Cluster visualization
- Task 4.5: Cluster management UI

### Phase 5 (Weeks 9-10): Multi-Idea Chat
- Task 5.1: Graph context builder
- Task 5.2: Multi-idea chat API
- Task 5.3: Graph RAG prompts
- Task 5.4: Multi-select UI
- Task 5.5: Chat interface

### Phase 6 (Weeks 11-12): Smart Suggestions
- Task 6.1: Suggestion algorithm
- Task 6.2: Background analysis
- Task 6.3: Notification system
- Task 6.4: Quick-connect UI
- Task 6.5: Explanation tooltips

---

**Total Estimated Time**: 12 weeks (3 months)  
**Team Size**: 1-2 developers  
**Complexity**: Medium-High

