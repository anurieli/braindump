# Brain Dump Canvas - Graph RAG Intelligence System
**Product Requirements Document**

**Date Created**: November 8, 2025  
**Version**: 1.0  
**Status**: Planning

---

## Executive Summary

Transform Brain Dump Canvas from a visual brainstorming tool into an intelligent knowledge graph system powered by Graph RAG (Retrieval-Augmented Generation). This enhancement leverages existing embeddings infrastructure to enable semantic search, intelligent canvas organization, multi-idea conversations, and context-aware AI interactions.

---

## Problem Statement

### Current Limitations
1. **Limited Search**: Can only find exact text matches, missing semantically similar ideas
2. **Manual Organization**: Users must manually position and connect related ideas
3. **Isolated Context**: Each idea is treated independently, losing valuable relationship context
4. **Shallow AI Interactions**: AI operations (summarization, etc.) don't leverage graph structure
5. **No Discovery**: Users can't easily discover patterns, themes, or clusters in their brainstorms

### User Pain Points
- "I know I had a similar idea somewhere, but can't find it"
- "My canvas is a mess, I wish it could organize itself"
- "I want to understand the big picture of all my ideas together"
- "The AI should understand how my ideas connect, not just individual thoughts"

---

## Vision & Goals

### Vision
Enable users to have intelligent conversations with their entire knowledge graph, where the AI understands not just individual ideas, but the rich context of how ideas relate, cluster, and evolve together.

### Success Metrics
- **Search Accuracy**: 90%+ relevance for semantic searches
- **Organization Efficiency**: 70% reduction in manual positioning time
- **AI Context Quality**: 3x more relevant AI responses using graph context
- **User Engagement**: 50% increase in multi-idea interactions
- **Discovery Rate**: Users find 40% more connections between ideas

---

## Technical Architecture

### Current Foundation (Already Built ✅)
- PostgreSQL with pgvector extension
- OpenAI text-embedding-3-small (1536 dimensions)
- IVFFlat vector index for similarity search
- Ideas table with embedding column
- Edges table with relationship types
- Spatial index (GIST) for proximity queries

### What We're Adding

#### Phase 1: Vector Search Foundation
**Database Functions**
```sql
-- Similarity search function
match_ideas(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  brain_dump_filter text
) RETURNS TABLE(id, content, similarity_score, x, y)

-- Context-enriched search
search_with_context(
  query_embedding vector(1536),
  include_connected boolean,
  depth int
) RETURNS TABLE(idea, connected_ideas[], similarity_score)

-- Cluster detection
detect_clusters(
  brain_dump_id text,
  similarity_threshold float,
  min_cluster_size int
) RETURNS TABLE(cluster_id, idea_ids[], centroid_x, centroid_y, theme)
```

#### Phase 2: Graph-Aware Embeddings
**Enhanced Embedding Strategy**
- **Content Embedding**: Current text-only embedding (keep as-is)
- **Context Embedding**: Text + connected ideas + metadata
- **Structural Embedding**: Graph position (using node2vec-style approach)

**New Database Schema**
```sql
-- Store multiple embedding types
ALTER TABLE ideas ADD COLUMN context_embedding vector(1536);
ALTER TABLE ideas ADD COLUMN structural_features jsonb;

-- Cache similarity scores
CREATE TABLE idea_similarities (
  idea1_id text REFERENCES ideas(id),
  idea2_id text REFERENCES ideas(id),
  content_similarity float,
  context_similarity float,
  structural_similarity float,
  combined_score float,
  calculated_at timestamptz DEFAULT NOW(),
  PRIMARY KEY (idea1_id, idea2_id)
);

-- Cluster assignments
CREATE TABLE idea_clusters (
  id text PRIMARY KEY,
  brain_dump_id text REFERENCES brain_dumps(id),
  name text,
  theme text,
  centroid_x float,
  centroid_y float,
  color text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE cluster_members (
  cluster_id text REFERENCES idea_clusters(id),
  idea_id text REFERENCES ideas(id),
  membership_score float,
  is_core_member boolean DEFAULT false,
  PRIMARY KEY (cluster_id, idea_id)
);
```

#### Phase 3: Intelligent Layout Engine
**Force-Directed Layout with Similarity**
- Similar ideas attract each other
- Dissimilar ideas repel
- Connected ideas have spring forces
- Preserve user-positioned "anchors"

**Clustering Algorithms**
- DBSCAN for density-based clustering
- K-means for fixed-number clusters
- Hierarchical clustering for nested themes

---

## Feature Specifications

### Feature 1: Semantic Search
**User Story**: As a user, I want to find ideas by meaning, not just keywords

**Functionality**
- Search bar with "semantic mode" toggle
- Real-time similarity scoring
- Visual highlighting of similar ideas on canvas
- "Find similar" button on each idea card

**API Endpoints**
```typescript
GET /api/search?q={query}&mode=semantic&threshold=0.7&limit=20
GET /api/ideas/{id}/similar?threshold=0.7&limit=10&includeConnected=true
```

**UI Components**
- Enhanced search bar with mode selector
- Similarity score badges (0-100%)
- "Similar ideas" panel in detail modal
- Canvas highlighting for search results

---

### Feature 2: Auto-Arrange Canvas
**User Story**: As a user, I want my canvas to organize itself by topic/similarity

**Functionality**
- "Arrange by similarity" button in toolbar
- Multiple layout algorithms:
  - **Force-directed**: Organic, physics-based
  - **Clustering**: Group by themes
  - **Radial**: Central idea with related ideas around it
- Preserve manually positioned "anchor" ideas
- Smooth animated transitions

**Algorithm Options**
```typescript
interface LayoutOptions {
  method: 'force-directed' | 'clustering' | 'radial' | 'hierarchical';
  preserveAnchors?: boolean; // Keep user-positioned ideas fixed
  animationDuration?: number; // ms
  similarityWeight?: number; // 0-1, how much similarity affects layout
  edgeWeight?: number; // 0-1, how much edges affect layout
  spatialWeight?: number; // 0-1, how much current position affects layout
}
```

**API Endpoints**
```typescript
POST /api/brain-dumps/{id}/layout
Body: {
  method: 'force-directed',
  options: LayoutOptions
}
Response: {
  updates: Array<{id: string, x: number, y: number}>
}
```

---

### Feature 3: Cluster Detection & Visualization
**User Story**: As a user, I want to see themes and patterns in my brainstorm

**Functionality**
- Automatic cluster detection
- Visual cluster boundaries (colored regions)
- Cluster naming/theming (AI-generated)
- Cluster summary cards
- "Expand/collapse cluster" interaction

**Cluster Properties**
```typescript
interface IdeaCluster {
  id: string;
  name: string; // AI-generated or user-defined
  theme: string; // AI-generated description
  ideas: string[]; // idea IDs
  centroid: {x: number, y: number};
  color: string;
  boundingBox: {x: number, y: number, width: number, height: number};
  coherenceScore: number; // 0-1, how similar ideas are
}
```

**UI Components**
- Cluster boundary overlays (SVG paths)
- Cluster control panel
- "Create cluster from selection" button
- Cluster summary modal

---

### Feature 4: Multi-Idea Chat
**User Story**: As a user, I want to have conversations about multiple ideas or entire brainstorms

**Functionality**
- Select multiple ideas → "Chat with selection"
- "Chat with entire brainstorm" button
- "Chat with cluster" option
- Context-aware AI responses using Graph RAG

**Graph RAG Implementation**
```typescript
interface ChatContext {
  // Primary ideas
  selectedIdeas: Idea[];
  
  // Graph context
  connectedIdeas: {
    idea: Idea;
    relationship: string;
    distance: number; // hops from selected ideas
  }[];
  
  // Cluster context
  clusters: {
    id: string;
    theme: string;
    memberCount: number;
  }[];
  
  // Temporal context
  timeline: {
    sessionGroups: Map<string, Idea[]>;
    chronology: Idea[];
  };
  
  // Spatial context
  spatialGroups: {
    region: string; // e.g., "top-left quadrant"
    ideas: Idea[];
  }[];
}

async function buildGraphRAGContext(
  ideaIds: string[],
  options: {
    includeConnected?: boolean;
    maxDepth?: number; // how many hops to traverse
    includeClusters?: boolean;
    includeTemporal?: boolean;
    includeSpatial?: boolean;
  }
): Promise<ChatContext>
```

**API Endpoints**
```typescript
POST /api/chat/multi-idea
Body: {
  ideaIds: string[];
  query: string;
  contextOptions: {
    includeConnected: true,
    maxDepth: 2,
    includeClusters: true
  }
}
```

---

### Feature 5: Smart Relationship Suggestions
**User Story**: As a user, I want the system to suggest connections I might have missed

**Functionality**
- Background analysis of unconnected similar ideas
- "Suggested connections" notification badge
- One-click to create suggested edge
- Explanation of why connection is suggested

**Suggestion Algorithm**
```typescript
interface RelationshipSuggestion {
  sourceId: string;
  targetId: string;
  similarityScore: number;
  reason: string; // "High semantic similarity (0.89)"
  suggestedType: string; // edge type
  confidence: number; // 0-1
}

// Find high-similarity pairs without existing edges
async function suggestRelationships(
  brainDumpId: string,
  threshold: number = 0.75
): Promise<RelationshipSuggestion[]>
```

---

### Feature 6: Context-Aware AI Operations
**User Story**: As a user, I want AI operations to understand the full context of my ideas

**Enhanced AI Operations**
- **Summarization**: Include context from connected ideas
- **Expansion**: Suggest related ideas based on graph
- **Question Answering**: Use graph traversal for comprehensive answers
- **Idea Generation**: Generate ideas that fit into existing clusters/themes

**Example: Context-Aware Summarization**
```typescript
async function generateContextAwareSummary(ideaId: string): Promise<string> {
  const idea = await getIdea(ideaId);
  const context = await buildGraphRAGContext([ideaId], {
    includeConnected: true,
    maxDepth: 1
  });
  
  const prompt = `
    Summarize this idea considering its context:
    
    Main Idea: ${idea.content}
    
    Connected Ideas:
    ${context.connectedIdeas.map(c => 
      `- ${c.relationship}: ${c.idea.content}`
    ).join('\n')}
    
    Cluster Theme: ${context.clusters[0]?.theme || 'N/A'}
    
    Provide a summary that captures the idea's role in the broader context.
  `;
  
  return await callOpenAI(prompt);
}
```

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Get basic vector search working

**Tasks**:
1. Create `match_ideas()` database function
2. Build `/api/search` endpoint with semantic mode
3. Add "Find similar" feature to idea detail modal
4. Test with existing embeddings
5. Fix embedding generation (currently not working for test ideas)

**Deliverables**:
- Working semantic search
- Similar ideas API
- Basic UI for similarity display

---

### Phase 2: Enhanced Embeddings (Weeks 3-4)
**Goal**: Add context-aware embeddings

**Tasks**:
1. Create context embedding generation function
2. Add `context_embedding` column to ideas table
3. Update background job queue to generate both embeddings
4. Create `idea_similarities` cache table
5. Build similarity calculation service

**Deliverables**:
- Dual embedding system
- Similarity cache
- Improved search accuracy

---

### Phase 3: Intelligent Layout (Weeks 5-6)
**Goal**: Auto-arrange canvas by similarity

**Tasks**:
1. Implement force-directed layout algorithm
2. Build clustering algorithm (DBSCAN)
3. Create layout API endpoint
4. Add "Arrange by similarity" UI button
5. Implement smooth animations

**Deliverables**:
- Working auto-layout feature
- Multiple layout algorithms
- Animated transitions

---

### Phase 4: Cluster Detection (Weeks 7-8)
**Goal**: Visualize themes and patterns

**Tasks**:
1. Create cluster detection algorithm
2. Build cluster database schema
3. Implement AI-powered cluster naming
4. Add cluster visualization to canvas
5. Create cluster management UI

**Deliverables**:
- Automatic cluster detection
- Visual cluster boundaries
- Cluster summary cards

---

### Phase 5: Multi-Idea Chat (Weeks 9-10)
**Goal**: Graph RAG conversations

**Tasks**:
1. Build graph context builder
2. Create multi-idea chat API
3. Implement Graph RAG prompt engineering
4. Add multi-select UI for ideas
5. Create chat interface for selections

**Deliverables**:
- Multi-idea selection
- Context-aware chat
- Graph RAG implementation

---

### Phase 6: Smart Suggestions (Weeks 11-12)
**Goal**: Proactive relationship suggestions

**Tasks**:
1. Build suggestion algorithm
2. Create background analysis job
3. Add suggestion notification system
4. Implement one-click edge creation
5. Add explanation UI

**Deliverables**:
- Relationship suggestions
- Notification system
- Quick-connect UI

---

## Technical Considerations

### Performance
- **Vector Search**: IVFFlat index already optimized (lists=100)
- **Caching**: Use `idea_similarities` table to cache expensive calculations
- **Batch Processing**: Generate embeddings and similarities in background
- **Incremental Updates**: Only recalculate when ideas/edges change

### Scalability
- **Current**: Optimized for <10K ideas per brain dump
- **Target**: Support up to 50K ideas with sub-second search
- **Strategy**: Increase IVFFlat lists parameter as data grows

### Cost Management
- **Embeddings**: ~$0.00002 per idea (1536 dimensions)
- **Context Embeddings**: Additional $0.00002 per idea
- **Estimated**: $0.04 per 1000 ideas (both embeddings)
- **Optimization**: Cache embeddings, only regenerate on content change

### Data Migration
- **Zero Downtime**: All new columns are nullable
- **Backward Compatible**: Existing features continue to work
- **Gradual Rollout**: Generate new embeddings in background

---

## Success Criteria

### Phase 1 Success
- [ ] Semantic search returns relevant results 90%+ of the time
- [ ] "Find similar" feature used by 60%+ of users
- [ ] Search response time < 500ms

### Phase 2 Success
- [ ] Context embeddings improve search accuracy by 20%+
- [ ] Similarity cache reduces calculation time by 80%+
- [ ] Embedding generation completes within 2 seconds

### Phase 3 Success
- [ ] Auto-layout produces visually coherent arrangements
- [ ] 70%+ of users try auto-layout feature
- [ ] Layout animation feels smooth (60fps)

### Phase 4 Success
- [ ] Cluster detection identifies meaningful themes
- [ ] AI-generated cluster names are accurate 80%+ of time
- [ ] Users create/modify 40%+ of detected clusters

### Phase 5 Success
- [ ] Multi-idea chat provides more relevant answers than single-idea
- [ ] Graph RAG context improves response quality (user rating)
- [ ] 50%+ of chat sessions use multi-idea selection

### Phase 6 Success
- [ ] Relationship suggestions have 70%+ acceptance rate
- [ ] Users discover 40% more connections via suggestions
- [ ] Suggestion notification doesn't feel spammy (<5 per session)

---

## Risk Assessment

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Vector search performance degrades with scale | High | Medium | Monitor query times, optimize indexes, implement pagination |
| Embedding generation costs exceed budget | Medium | Low | Cache aggressively, only regenerate on change, use smaller dimensions if needed |
| Layout algorithms produce poor arrangements | Medium | Medium | Provide multiple algorithms, allow manual override, gather user feedback |
| Graph traversal becomes too slow | High | Low | Limit depth, cache results, use materialized views |

### User Experience Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Auto-layout disrupts user's mental model | High | Medium | Always allow undo, preserve anchors, animate transitions |
| Too many suggestions feel overwhelming | Medium | High | Limit to top 5, allow dismissal, learn from user behavior |
| AI context doesn't improve responses | High | Low | A/B test with/without context, iterate on prompt engineering |

---

## Future Enhancements (Post-MVP)

### Advanced Features
1. **Temporal Analysis**: "Show me how my thinking evolved over time"
2. **Cross-Brainstorm Search**: Find similar ideas across all brain dumps
3. **Collaborative Clustering**: Multiple users contribute to same clusters
4. **Export Knowledge Graph**: Generate markdown/PDF with full graph structure
5. **AI-Powered Insights**: "Here are 3 patterns I noticed in your brainstorm"

### Advanced Graph RAG
1. **Multi-Hop Reasoning**: Answer questions requiring multiple graph traversals
2. **Contradiction Detection**: "These two ideas seem to conflict"
3. **Gap Analysis**: "You have ideas about X and Z, but nothing about Y"
4. **Trend Detection**: Identify emerging themes across sessions

---

## Appendix

### Glossary
- **Graph RAG**: Retrieval-Augmented Generation using graph structure for context
- **Embedding**: Vector representation of text for semantic similarity
- **IVFFlat**: Inverted File Flat, a vector indexing algorithm
- **Cosine Similarity**: Measure of similarity between two vectors (0-1)
- **DBSCAN**: Density-Based Spatial Clustering of Applications with Noise
- **Node2Vec**: Algorithm for learning vector representations of graph nodes

### References
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Graph RAG Paper](https://arxiv.org/abs/2404.16130)
- [Force-Directed Layout](https://en.wikipedia.org/wiki/Force-directed_graph_drawing)

---

**Document Owner**: Development Team  
**Last Updated**: November 8, 2025  
**Next Review**: After Phase 1 completion

