# Brain Dump Canvas - Technical Architecture

**Version**: 1.2  
**Last Updated**: November 10, 2025

---

## System Overview

Brain Dump Canvas is a full-stack web application built with Next.js, PostgreSQL, and OpenAI. The architecture prioritizes performance, modularity, and extensibility while maintaining simplicity for the MVP.

```
┌─────────────────────────────────────────────────────────┐
│                     User Browser                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (React)                 │  │
│  │  - Canvas (Konva.js)                             │  │
│  │  - State Management (Zustand)                    │  │
│  │  - UI Components (Tailwind)                      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Backend)               │
│  - REST endpoints for CRUD operations                   │
│  - Background job queue for AI processing               │
│  - WebSocket for real-time updates                      │
└────────┬────────────────────────┬───────────────────────┘
         │                        │
         ↓                        ↓
┌──────────────────┐    ┌──────────────────────┐
│   Supabase       │    │   OpenAI API         │
│   PostgreSQL     │    │  - GPT-4             │
│   (with pgvector)│    │  - Embeddings        │
│                  │    │    (3-small)         │
│  - Ideas         │    └──────────────────────┘
│  - Edges         │
│  - Brain Dumps   │
│  - Attachments   │
└──────────────────┘
         │
         ↓
┌──────────────────┐
│  Supabase        │
│  Storage (S3)    │
│  - File uploads  │
└──────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Canvas**: Konva.js (react-konva)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

### Backend
- **Runtime**: Next.js API Routes (Node.js)
- **Database**: Supabase PostgreSQL with pgvector
- **Query**: Raw SQL with `pg` library
- **Storage**: Supabase Storage
- **Jobs**: Simple in-memory queue (upgrade to BullMQ if needed)

### AI Services
- **Summarization**: OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)

---

## Data Model

### Database Schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Brain Dumps (Workspaces)
CREATE TABLE brain_dumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  viewport_x FLOAT DEFAULT 0,
  viewport_y FLOAT DEFAULT 0,
  viewport_zoom FLOAT DEFAULT 1.0
);

CREATE INDEX idx_brain_dumps_archived ON brain_dumps(archived_at);

-- Ideas (Nodes on Canvas - Text and Attachment types)
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_dump_id UUID NOT NULL REFERENCES brain_dumps(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  summary TEXT,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  width FLOAT DEFAULT 200,
  height FLOAT DEFAULT 100,
  type VARCHAR(20) NOT NULL DEFAULT 'text',  -- NEW: 'text' or 'attachment'
  state VARCHAR(20) DEFAULT 'generating',
  session_id UUID,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT ideas_type_valid CHECK (type IN ('text', 'attachment'))
);

CREATE INDEX idx_ideas_brain_dump ON ideas(brain_dump_id);
CREATE INDEX idx_ideas_state ON ideas(state);
CREATE INDEX idx_ideas_type ON ideas(type);  -- NEW: Index on idea type
CREATE INDEX idx_ideas_session ON ideas(session_id);
CREATE INDEX idx_ideas_spatial ON ideas USING gist (point(position_x, position_y));
CREATE INDEX idx_ideas_embedding ON ideas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Users (Authentication and Preferences)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);

-- Edges (Relationships)
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brain_dump_id UUID NOT NULL REFERENCES brain_dumps(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'related_to',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_edge UNIQUE(parent_id, child_id),
  CONSTRAINT no_self_reference CHECK (parent_id != child_id)
);

CREATE INDEX idx_edges_brain_dump ON edges(brain_dump_id);
CREATE INDEX idx_edges_parent ON edges(parent_id);
CREATE INDEX idx_edges_child ON edges(child_id);

-- Edge Types (User-customizable)
CREATE TABLE edge_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default edge types
INSERT INTO edge_types (name, is_default) VALUES
  ('related_to', true),
  ('prerequisite_for', true),
  ('inspired_by', true),
  ('blocks', true),
  ('similar_to', true),
  ('depends_on', true);

-- Attachments (Files for Attachment Ideas)
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- 'image', 'pdf', 'file'
  url TEXT NOT NULL,  -- Supabase Storage URL or base64 data URL
  filename TEXT,
  metadata JSONB DEFAULT '{}',  -- fileSize, mimeType, width, height, thumbnailUrl, isBase64
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_idea ON attachments(idea_id);

-- Graph helper functions
CREATE OR REPLACE FUNCTION get_descendants(idea_id UUID)
RETURNS TABLE(id UUID, depth INT) AS $$
  WITH RECURSIVE descendants AS (
    SELECT child_id AS id, 1 AS depth
    FROM edges
    WHERE parent_id = idea_id
    UNION ALL
    SELECT e.child_id, d.depth + 1
    FROM edges e
    JOIN descendants d ON e.parent_id = d.id
  )
  SELECT * FROM descendants;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_ancestors(idea_id UUID)
RETURNS TABLE(id UUID, depth INT) AS $$
  WITH RECURSIVE ancestors AS (
    SELECT parent_id AS id, 1 AS depth
    FROM edges
    WHERE child_id = idea_id
    UNION ALL
    SELECT e.parent_id, a.depth + 1
    FROM edges e
    JOIN ancestors a ON e.child_id = a.id
  )
  SELECT * FROM ancestors;
$$ LANGUAGE SQL;
```

---

## User Preferences System

### Overview

The user preferences system stores personalized settings in the `users.metadata` JSONB column, providing seamless theme and UI customization that persists across sessions.

### Data Structure

```json
{
  "preferences": {
    "theme": "dark",
    "gridSettings": {
      "isVisible": true,
      "patternType": "dots"
    },
    "ui": {
      "isSidebarOpen": true,
      "isControlPanelOpen": false,
      "enableAnimations": true,
      "renderQuality": "high"
    }
  },
  "raw_user_meta": { /* Auth provider metadata */ }
}
```

### Implementation Components

**Type System**:
- `UserPreferences` interface in `src/types/index.ts`
- Strong typing for theme, grid, and UI preferences
- Default preferences with fallback values

**State Management**:
- Enhanced `UiSlice` in Zustand store with preference loading/saving
- Automatic synchronization between UI state and database
- Debounced auto-save (300ms) to prevent excessive writes

**Database Layer**:
- Utility functions in `src/lib/userPreferences.ts`
- `getUserPreferences()` - loads with defaults
- `updateUserPreferences()` - merges partial updates
- Convenience functions for theme/grid/UI updates

**React Integration**:
- `useUserPreferences` hook handles auto-load and auto-save
- Listens to authentication state changes
- Debounced preference saving when UI state changes

### Preference Categories

**Theme Settings**:
- `theme`: `'light' | 'dark'`
- Controls overall application appearance
- Affects glass effects, text colors, and backgrounds

**Grid Settings**:
- `isVisible`: boolean - grid visibility toggle
- `patternType`: `'grid' | 'dots' | 'none'` - visual pattern
- Synchronized with canvas grid display

**UI Settings**:
- `isSidebarOpen`: boolean - sidebar panel state
- `isControlPanelOpen`: boolean - control panel state
- `enableAnimations`: boolean - animation preferences
- `renderQuality`: `'low' | 'medium' | 'high'` - performance setting

### Usage Flow

1. **User Login** → `useUserPreferences` auto-loads preferences
2. **Settings Change** → UI state updates immediately (optimistic)
3. **300ms Delay** → Debounced save to database
4. **Next Session** → Preferences restored automatically

This system requires no user action and provides seamless preference persistence across all application sessions.

---

## API Design

### REST Endpoints

**Brain Dumps**
```
GET    /api/brain-dumps              - List all brain dumps
POST   /api/brain-dumps              - Create new brain dump
GET    /api/brain-dumps/:id          - Get brain dump details
PATCH  /api/brain-dumps/:id          - Update name/viewport
DELETE /api/brain-dumps/:id          - Soft delete (archive)
POST   /api/brain-dumps/:id/duplicate - Duplicate brain dump
```

**Ideas**
```
GET    /api/brain-dumps/:id/ideas    - Get all ideas in brain dump
POST   /api/ideas                    - Create new idea (text or attachment)
GET    /api/ideas/:id                - Get idea details
PATCH  /api/ideas/:id                - Update idea (text, position, etc.)
DELETE /api/ideas/:id                - Delete idea
GET    /api/ideas/:id/similar        - Find similar ideas (embeddings)
GET    /api/ideas/:id/children       - Get child ideas
GET    /api/ideas/:id/parent         - Get parent idea
POST   /api/ideas/attachment         - Create attachment idea with file upload
```

**Edges**
```
POST   /api/edges                    - Create edge
PATCH  /api/edges/:id                - Update edge (type, note)
DELETE /api/edges/:id                - Delete edge
GET    /api/edge-types               - Get all edge types
POST   /api/edge-types               - Create custom edge type
```

**Attachments & File Upload**
```
POST   /api/attachments              - Upload attachment to Supabase Storage
DELETE /api/attachments/:id          - Delete attachment and file
POST   /api/upload                   - Multi-part file upload with validation
```

---

## Attachment System Architecture

### File Upload Pipeline ✅ IMPLEMENTED

The attachment system implements a hybrid storage approach that handles both Supabase Storage and base64 fallback:

```typescript
// File Upload Flow
User drops file → Canvas.handleFileDrop() 
→ FileDropModal (description input)
→ Canvas.handleFileModalConfirm()
→ ideasSlice.addAttachmentIdea()
→ file-upload.uploadFile()
→ Supabase Storage (preferred) OR base64 fallback
→ AttachmentNode renders with preview
```

### Storage Strategy

**Primary: Supabase Storage**
- Public bucket: `attachments` 
- CDN-delivered files for optimal performance
- Proper file management with deletion capabilities

**Fallback: Base64 Encoding (< 1MB files)**
- Used when Supabase Storage policies aren't configured
- Files stored as data URLs in database
- Immediate functionality without external setup

### Component Architecture

```
Canvas
├── IdeaNode (type="text")
│   └── Regular text idea UI
└── IdeaNode (type="attachment") 
    └── AttachmentNode
        ├── File preview (image thumbnails or file icons)
        ├── Download button
        ├── Metadata display (filename, size)
        └── All standard interactions (drag, select, connect)
```

### File Processing Features

**Image Thumbnails**:
- Client-side Canvas API processing
- 200px max dimension with aspect ratio preservation
- JPEG compression at 80% quality
- Blob URL generation for display

**File Type Detection**:
- MIME type validation for security
- Support for: images (PNG, JPG, WebP, GIF), PDFs, text files
- Max file size: 10MB with user-friendly error messages

---

## AI Processing Pipeline

### Shared AI Module

- Location: `src/lib/ai/`
- Includes centralized OpenAI client creation, model metadata (IDs, pricing, defaults), reusable prompt templates, and helpers like `summarizeText` / `createEmbedding`
- Every AI node should consume these helpers so prompts, models, and cost tracking stay consistent
- Helper responses include `{ data, model, usage }` enabling unified logging into `ai_operations`

### 1. Idea Creation Flow

```
User Input
    ↓
Create Idea (state: 'generating')
    ↓
Return to Frontend (optimistic UI)
    ↓
Background Jobs (async):
    ├─ Summarization (if text > 50 chars)
    ├─ Embedding Generation
    └─ Metadata Extraction
    ↓
Update Idea (state: 'ready')
    ↓
Notify Frontend (WebSocket)
```

### 2. Summarization Node

**Trigger**: Text length > 50 characters OR > 2 lines

**Process**:
```typescript
import { summarizeText } from '@/lib/ai'

async function summarizeIdea(ideaId: string, text: string) {
  const result = await summarizeText(text, {
    variant: 'idea',
    overrides: { max_tokens: 30 },
  })

  const summary = result.data

  await db.query('UPDATE ideas SET summary = $1 WHERE id = $2', [summary, ideaId])

  await logAiOperation({
    ideaId,
    type: 'summarization',
    model: result.model.id,
    usage: result.usage,
  })

  return summary
}
```

**Configuration** (Controllable):
- Model: `summarization` task config in `src/lib/ai/models.ts` (defaults to `gpt-4`)
- Max tokens: `30` (adjustable)
- Temperature: `0.3` (low for consistency)
- System prompt: Controlled in `src/lib/ai/prompts.ts`
- Fallback behavior: Truncate if API fails

### 3. Embedding Generation Node

**Trigger**: Every idea (on creation and edit)

**Process**:
```typescript
import { createEmbedding } from '@/lib/ai'

async function generateEmbedding(ideaId: string, text: string) {
  const result = await createEmbedding(text)
  const embedding = result.data

  await db.query('UPDATE ideas SET embedding = $1 WHERE id = $2', [JSON.stringify(embedding), ideaId])

  await logAiOperation({
    ideaId,
    type: 'embedding',
    model: result.model.id,
    usage: result.usage,
  })

  return embedding
}
```

**Configuration** (Controllable):
- Model: `embedding` task config in `src/lib/ai/models.ts` (defaults to `text-embedding-3-small`)
- Dimensions: `1536` (can reduce to `512` for cheaper storage)
- Retry logic: 3 attempts with exponential backoff
- Failure behavior: Log error, continue without embedding

### 4. Metadata Extraction Node

**Trigger**: Every idea (detect URLs, keywords, etc.)

**Process**:
```typescript
async function extractMetadata(text: string, attachments: any[]) {
  const metadata: any = {
    word_count: text.split(/\s+/).length,
    has_url: false,
    url_domains: [],
    has_attachments: attachments.length > 0,
    attachment_types: []
  };
  
  // Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  
  if (urls.length > 0) {
    metadata.has_url = true;
    metadata.url_domains = urls.map(url => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
  
  // Extract attachment types
  metadata.attachment_types = attachments.map(a => a.type);
  
  return metadata;
}
```

---

## Background Job Queue

### Simple In-Memory Queue (MVP)

```typescript
// lib/queue.ts
type Job = {
  id: string;
  type: 'summarize' | 'embed';
  data: any;
};

class JobQueue {
  private queue: Job[] = [];
  private processing = false;
  
  async add(type: Job['type'], data: any) {
    const job: Job = {
      id: crypto.randomUUID(),
      type,
      data
    };
    
    this.queue.push(job);
    this.process();
  }
  
  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      
      try {
        switch (job.type) {
          case 'summarize':
            await summarizeIdea(job.data.ideaId, job.data.text);
            break;
          case 'embed':
            await generateEmbedding(job.data.ideaId, job.data.text);
            break;
        }
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
      }
    }
    
    this.processing = false;
  }
}

export const queue = new JobQueue();
```

**Upgrade Path**: Replace with BullMQ + Redis for production

---

## Undo/Redo System

### Architecture

The undo/redo system maintains history stacks per brain dump and synchronizes with the database to restore deleted items.

**UndoRedoManager Class**:
- Manages history array with max 50 states
- Tracks current position for undo/redo navigation
- Deep clones ideas and edges to prevent reference issues

**Automatic Tracking**:
- Zustand subscription captures state changes
- 100ms debounce prevents excessive snapshots during dragging
- Only saves when ideas or edges actually change

### Database Synchronization

**Critical Feature**: When undoing, the system detects deleted items and restores them to the database using `upsert` operations.

**Why This Matters**:
- PostgreSQL CASCADE DELETE removes edges when ideas are deleted
- Without database sync, restored items would disappear on page refresh
- Ideas must be restored BEFORE edges (foreign key constraints)

**Edge CASCADE Handling**:
When deleting an idea, the system:
1. Finds all connected edges (will be CASCADE deleted by database)
2. Removes both idea AND edges from local state simultaneously
3. Ensures history accurately captures all deletions

**Problem Solved**: Edges previously remained in local state after idea deletion, causing incomplete history. Now both are removed together.

### User Interface

- **Control Panel**: Undo/Redo buttons in top-right corner
- **Keyboard Shortcuts**: `Cmd+Z` / `Cmd+Shift+Z` (works globally except in text inputs)
- **Button States**: Automatically disabled when no actions available
- **Performance**: ~2KB per history entry, async database operations

---

## Frontend Architecture

### State Management (Zustand)

```typescript
// store/canvasStore.ts
import create from 'zustand';

interface CanvasState {
  // Current brain dump
  activeBrainDumpId: string | null;
  brainDumps: BrainDump[];
  
  // Canvas data
  ideas: Idea[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  
  // UI state
  selectedIdeaIds: string[];
  hoveredIdeaId: string | null;
  modalIdeaId: string | null;
  sidePanelOpen: boolean;
  
  // Undo/redo
  undoStack: Action[];
  redoStack: Action[];
  
  // Actions
  setActiveBrainDump: (id: string) => void;
  addIdea: (idea: Idea) => void;
  updateIdea: (id: string, updates: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // ... implementation
}));
```

### Canvas Component (Konva)

```typescript
// components/Canvas.tsx
import { Stage, Layer, Rect } from 'react-konva';
import IdeaNode from './IdeaNode';
import EdgeRenderer from './EdgeRenderer';

export default function Canvas() {
  const { ideas, edges, viewport } = useCanvasStore();
  const stageRef = useRef<Konva.Stage>(null);
  
  // Viewport culling - only render visible ideas
  const visibleIdeas = useMemo(() => {
    const buffer = 500; // pixels
    return ideas.filter(idea => {
      const screenPos = canvasToScreen(idea.position, viewport);
      return (
        screenPos.x > -buffer &&
        screenPos.x < window.innerWidth + buffer &&
        screenPos.y > -buffer &&
        screenPos.y < window.innerHeight + buffer
      );
    });
  }, [ideas, viewport]);
  
  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={window.innerHeight}
      scaleX={viewport.zoom}
      scaleY={viewport.zoom}
      x={viewport.x}
      y={viewport.y}
    >
      <Layer>
        {/* Grid background */}
        <GridBackground />
        
        {/* Edges */}
        <EdgeRenderer edges={edges} ideas={ideas} />
        
        {/* Ideas */}
        {visibleIdeas.map(idea => (
          <IdeaNode key={idea.id} idea={idea} />
        ))}
      </Layer>
    </Stage>
  );
}
```

### Visual State Management

The IdeaNode component implements multiple visual states to provide rich user feedback:

**Visual State Hierarchy** (higher priority states override lower ones):
1. **Selection State** - Blue border and shadow when idea is selected
   - Border: `4px solid #3b82f6` 
   - Shadow: `0 0 20px rgba(59, 130, 246, 0.6)`
   - Background: `rgba(59, 130, 246, 0.05)`

2. **Drag Target State** - Green border when being dragged over during edge creation
   - Border: `3px solid #10b981`
   - Shadow: `0 0 20px rgba(16, 185, 129, 0.6)`
   - Background: `rgba(16, 185, 129, 0.05)`

3. **Parent Indicator State** - Gold stroke for ideas that have children (relationships)
   - Border: `2px solid #d97706` 
   - Shadow: `0 0 15px rgba(217, 119, 6, 0.4)`
   - Background: `rgba(217, 119, 6, 0.03)`

4. **New Idea Glow** - Blue glow that dissipates over 5 seconds for newly created ideas
   - Duration: `5000ms` with linear fade
   - Shadow: `0 0 20px rgba(59, 130, 246, 0.45 * opacity)`
   - Background: `rgba(59, 130, 246, 0.08 * opacity)`

5. **Connection Source** - Blue ring when starting connection creation
   - Ring: `ring-2 ring-blue-400`

**Implementation Notes**:
- Visual states are computed in real-time based on store state
- Parent detection uses edge relationships: `edges.some(edge => edge.parent_id === idea.id)`
- Glow opacity calculated using: `Math.max(0, 1 - age / GLOW_DURATION_MS)`
- Multiple shadows are combined using CSS comma separation

---

## Performance Optimizations

**Viewport Culling**
- Only render ideas within visible area + 500px buffer
- Reduces DOM nodes from 1000+ to ~50

**Debounced Updates**
- Position changes batched and sent to server every 300ms
- Prevents excessive database writes

**Memoization**
- Edge calculations memoized
- Only recalculate when idea positions change

**Lazy Loading**
- Brain dumps loaded on-demand
- Embeddings generated asynchronously

**Index Optimization**
- Spatial index for proximity queries
- Vector index for similarity search
- Composite indexes on foreign keys

---

## Security Considerations

**Input Validation**
- Sanitize all user input
- Validate file types and sizes
- Prevent SQL injection (parameterized queries)

**Rate Limiting**
- 100 requests/minute per IP
- Prevents abuse of AI endpoints

**File Upload Security**
- Validate MIME types
- Scan for malware (future)
- Use presigned URLs for S3

**API Key Management**
- Store OpenAI key in environment variables
- Never expose in client code
- Rotate keys regularly

---

## Monitoring & Logging

**Error Tracking**
- Sentry for frontend and backend errors
- Log all AI failures with context

**Performance Monitoring**
- Track API response times
- Monitor canvas FPS
- Alert on slow queries (>500ms)

**Usage Analytics**
- Ideas created per day
- Brain dumps per user
- AI operation success rates
- Feature usage (edges, attachments, modals)

---

## Deployment

**Environment Variables**
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://...
```

**Build Process**
1. Run database migrations
2. Build Next.js app
3. Deploy to Vercel
4. Run smoke tests

**CI/CD**
- GitHub Actions for automated testing
- Deploy on merge to main
- Rollback on errors

