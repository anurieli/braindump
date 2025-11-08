# Brain Dump Canvas - MVP Product Requirements Document

**Version**: 1.1  
**Last Updated**: November 6, 2025  
**Target Completion**: 6 weeks from start

---

## Document Purpose

This PRD defines what needs to be built for the MVP. It focuses on product requirements, user flows, and feature specifications. Technical implementation details are in the Technical Architecture document.

---

## 1. Setup & Prerequisites

### 1.1 Required Accounts & Services

**Supabase** (Database & Storage):
- Create project at supabase.com
- Enable pgvector extension
- Note: Database URL, anon key, service role key

**OpenAI** (AI Services):
- Create account at platform.openai.com
- Generate API key
- Enable GPT-4 and Embeddings API access

**Vercel** (Deployment):
- Create account at vercel.com
- Connect GitHub repository
- Configure environment variables

### 1.2 Development Environment

**Required Software**:
- Node.js 18+ and npm/pnpm
- Git
- Code editor (VS Code, Cursor, etc.)
- PostgreSQL client (optional, for database inspection)

**Tech Stack**:
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Canvas: Konva.js (react-konva)
- State: Zustand
- Database: Supabase PostgreSQL with pgvector
- Storage: Supabase Storage (with base64 fallback for small files)
- AI: OpenAI API

### 1.3 Environment Variables

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
```

### 1.4 Initial Setup Steps

1. Initialize Next.js project with TypeScript and Tailwind
2. Install dependencies (konva, react-konva, zustand, pg, @supabase/supabase-js, openai)
3. Run database migrations (create tables, indexes, functions)
4. Seed default data (edge types, demo brain dump)
5. Configure Supabase client
6. Configure OpenAI client
7. Set up Zustand store structure
8. Create base folder structure (/components, /lib, /store, /config, /types)

---

## 2. Architecture Overview

### 2.1 System Components

**Frontend (Next.js)**:
- Window layout (top bar, side panel, canvas, input box)
- Canvas rendering (Konva.js for infinite 2D space)
- State management (Zustand for global state)
- UI components (ideas, edges, modals, forms)

**Backend (Next.js API Routes)**:
- REST API for CRUD operations
- Background job queue for AI processing
- Database queries (PostgreSQL via pg library)
- File upload handling (Supabase Storage)

**Database (Supabase PostgreSQL)**:
- Brain dumps (workspaces)
- Ideas (text and attachment nodes with position, embeddings)
- Edges (relationships between ideas)
- Attachments (files stored separately for attachment ideas)
- AI operations log (monitoring)

**AI Services (OpenAI)**:
- Summarization (GPT-4)
- Embeddings (text-embedding-3-small)

### 2.2 Data Flow

**Idea Creation Flow**:
```
User types in input box → Press Enter → 
Idea created in database (state: generating) → 
Idea appears on canvas immediately → 
Background: Summarization → Embedding generation → 
Idea updated (state: ready)
```

**Edge Creation Flow**:
```
User drags Idea A onto Idea B → 
Both ideas highlight → 
User releases → 
Modal appears with edge type selection → 
User selects type → 
Edge created in database → 
Edge rendered on canvas
```

**Brain Dump Switching Flow**:
```
User clicks brain dump in side panel → 
Save current viewport state → 
Load new brain dump data (ideas + edges) → 
Restore viewport state → 
Render canvas
```

### 2.3 Key Design Principles

**Optimistic UI**: Show changes immediately, sync in background
**Asynchronous Processing**: Never block user with AI operations
**Modular Components**: Each component is independent and reusable
**Performance First**: Viewport culling, debouncing, memoization
**Graceful Degradation**: System works without AI (with fallbacks)

---

## 3. User Flows

### 3.1 First-Time User Flow

**Goal**: Understand the app and create first ideas

**Steps**:
1. User opens app
2. Sees demo brain dump with 3-5 example ideas already on canvas
3. Sees quick input box at bottom with placeholder text
4. Types first idea and presses Enter
5. Idea appears on canvas near center
6. User can immediately type and submit another idea
7. User hovers over idea to see full text
8. User drags idea to reposition it
9. User drags one idea onto another
10. Edge creation modal appears
11. User selects edge type and creates connection
12. Edge appears on canvas

**Success Criteria**:
- User creates 5+ ideas in first session
- User creates at least 1 edge
- User understands spatial organization concept

### 3.2 Rapid Idea Capture Flow

**Goal**: Quickly dump many ideas without interruption

**Steps**:
1. User focuses on input box (auto-focused on page load)
2. Types idea text
3. Presses Enter
4. Idea appears on canvas (state: generating)
5. Input box clears immediately
6. User types next idea without waiting
7. Repeats 10-20 times rapidly
8. All ideas appear on canvas as they're submitted
9. Summaries appear asynchronously (1-5 seconds later)
10. User can continue adding ideas while AI processes previous ones

**Success Criteria**:
- Can submit 10 ideas in 30 seconds
- No lag or blocking
- All ideas appear within 100ms of submission

### 3.3 Idea Organization Flow

**Goal**: Organize and connect ideas spatially

**Steps**:
1. User has 20+ ideas on canvas
2. User pans canvas to see all ideas (Ctrl+Drag)
3. User zooms out to get overview (Cmd+Scroll)
4. User identifies related ideas
5. User drags ideas closer together
6. User creates edges between related ideas
7. User zooms in on specific cluster
8. User adds more ideas to cluster
9. User creates hierarchies with parent-child edges
10. Visual structure emerges

**Success Criteria**:
- User can navigate canvas smoothly (60 FPS)
- User creates meaningful spatial groupings
- User creates 5+ edges showing relationships

### 3.4 Idea Detail Flow

**Goal**: View and edit full idea details

**Steps**:
1. User double-clicks on idea
2. Modal opens showing full text
3. User sees all attachments
4. User sees connected ideas (parents and children)
5. User clicks "Edit" button
6. Text becomes editable
7. User modifies text
8. User adds/removes attachments
9. User clicks "Save"
10. Modal closes
11. Idea re-summarized if text changed significantly
12. Canvas updates

**Success Criteria**:
- Modal opens within 100ms
- All information clearly displayed
- Edit mode is intuitive
- Changes persist correctly

### 3.5 Multi-Workspace Flow

**Goal**: Manage multiple brain dumps for different projects

**Steps**:
1. User has ideas in current brain dump
2. User opens side panel (Ctrl+/)
3. User sees list of all brain dumps
4. User clicks "New Brain Dump"
5. New empty brain dump created
6. Name field becomes editable
7. User types name and presses Enter
8. User starts adding ideas to new brain dump
9. User switches back to previous brain dump
10. Previous canvas state restored (position, zoom)
11. User can work in multiple brain dumps independently

**Success Criteria**:
- Can create unlimited brain dumps (up to 100 for MVP)
- Switching is smooth (<1 second)
- Each brain dump is fully isolated
- Viewport state persists per brain dump

### 3.6 Attachment Ideas Flow ✅ IMPLEMENTED

**Goal**: Create file-based ideas by dropping files directly onto canvas

**Steps**:
1. User drags file from desktop onto canvas
2. Canvas shows visual drop zone indicator
3. File validation occurs (type, size limits)
4. Description input modal appears with pre-filled filename
5. User enters description and confirms
6. File uploads to storage (Supabase or base64 fallback)
7. Square attachment idea appears on canvas at drop location
8. File preview displays (image thumbnail or file type icon)
9. User can download file via download button
10. User can interact with attachment idea like regular ideas (move, connect, select)

**Success Criteria**: ✅ COMPLETE
- ✅ Drag-and-drop works smoothly
- ✅ Supported formats: images (PNG, JPG, WebP, GIF), PDFs, text files
- ✅ Thumbnails display correctly for images
- ✅ Files stored securely with hybrid storage approach
- ✅ Square aspect ratio maintained for attachment nodes
- ✅ Full integration with canvas interaction system

### 3.7 Undo/Redo Flow

**Goal**: Recover from mistakes with full database persistence

**Steps**:
1. User moves idea to wrong position
2. User presses Ctrl+Z (or clicks undo button)
3. Idea returns to previous position
4. User deletes idea with connected edges
5. User presses Ctrl+Z
6. Idea AND edges are restored (from database)
7. User creates edge
8. User presses Ctrl+Z
9. Edge is removed
10. User presses Ctrl+Y (or clicks redo button)
11. Edge is restored

**Success Criteria**:
- ✅ Undo/redo works for all actions (move, create, delete, edit)
- ✅ Max 50 actions in history per brain dump
- ✅ Keyboard shortcuts work reliably (async with database)
- ✅ Visual feedback via disabled button states
- ✅ Deleted items fully restored from database
- ✅ Connected edges restore with parent ideas

---

## 4. Core Components

### 4.1 Window Structure

**Top Bar** (60px height, fixed):
- Brain dump name (editable inline)
- Creation date (read-only)
- Idea count (updates in real-time)
- Control panel button (opens dropdown)

**Undo/Redo Controls** (positioned next to Control Panel):
- Two icon buttons in liquid-glass container
- Undo button (⟲ icon) - Command+Z
- Redo button (⟳ icon) - Command+Shift+Z
- Buttons disabled when no actions available
- Hover tooltips show keyboard shortcuts

**Control Panel Dropdown**:
- Theme toggle (light/dark)
- Grid toggle (show/hide)
- Grid style selector (dots/lines)
- Keyboard shortcuts link

**Side Panel** (240px width, collapsible):
- "New Brain Dump" button at top
- List of all brain dumps (scrollable)
- Each item shows: name, date, idea count
- Active brain dump highlighted
- Hover shows menu (enter, duplicate, delete)

**Canvas Area** (fills remaining space):
- Infinite 2D space with grid
- Pan with Ctrl+Drag
- Zoom with Cmd+Scroll
- Selection box with drag (no modifier)

**Quick Input** (80px height, expandable, fixed at bottom):
- Text input (auto-focused)
- Placeholder: "Type your idea and press Enter..."
- Shows current brain dump name
- Canvas accepts drag-and-drop for files (creates attachment ideas directly)

### 4.2 Brain Dump Management

**Create Brain Dump**:
- Click "New Brain Dump" button
- New brain dump created with name "Untitled Dump"
- Switch to new brain dump
- Name field becomes editable
- User can rename immediately

**Switch Brain Dump**:
- Click on brain dump in side panel
- Current viewport saved
- New brain dump loaded (ideas + edges)
- Viewport restored for new brain dump
- Loading indicator if >1 second

**Delete Brain Dump**:
- Click menu button on brain dump
- Click "Delete"
- Confirmation modal appears
- User confirms deletion
- Brain dump soft-deleted (archived_at set)
- Switch to most recent brain dump
- Recovery possible within 24 hours (future feature)

**Duplicate Brain Dump**:
- Click menu button on brain dump
- Click "Duplicate"
- New brain dump created with name "[Original] (Copy)"
- All ideas copied with same positions
- All edges copied with same relationships
- Switch to duplicated brain dump

### 4.3 Canvas System

**Grid**:
- Two styles: dots or lines
- Dots: 2px circles at 50px intervals
- Lines: 1px lines forming 50px squares
- Color: semi-transparent (20% opacity for dots, 10% for lines)
- Adapts to theme (dark gray in light mode, light gray in dark mode)
- Toggleable via control panel

**Navigation**:
- **Pan**: Ctrl+Drag or middle mouse button
- **Zoom**: Cmd+Scroll or Ctrl+vertical drag
- **Reset**: Ctrl+0 (center at origin, 100% zoom)
- **Selection**: Drag without modifier (creates selection box)

**Viewport State**:
- Position (x, y coordinates)
- Zoom level (0.1 to 3.0)
- Saved to database every 5 seconds
- Restored when reopening brain dump

**Performance**:
- Viewport culling (only render visible ideas + 500px buffer)
- 60 FPS target for pan/zoom
- Smooth animations (300ms for reset view)

### 4.4 Idea System

**Create Idea**:
- User types in quick input
- Presses Enter
- Idea created with state "generating"
- Positioned at viewport center + random offset
- Appears on canvas immediately
- Background: summarization → embedding
- State changes to "ready" when complete

**Display States**:

**Compact View** (default):
- **Text Ideas**: 150-300px wide, 60-120px tall with summary/truncated text
- **Attachment Ideas**: Square nodes (200x200px default) with file previews
- Content: Summary (if available) or truncated text, or file preview with description
- Max 50 characters, 2 lines for text display
- Style: white/dark gray background, subtle border, rounded corners
- No shadow in default state

**Peak View** (hover 300ms):
- Expands to show full text
- Max 400px wide, height auto-adjusts
- Action buttons appear: ✎ Edit, ✕ Delete
- Shadow increases, border highlights
- Slight scale up (1.05x)
- Z-index increases (appears above other ideas)

**Modal View** (double-click):
- Full-screen overlay (darkens background 80%)
- Modal: 600px wide, max 80vh height
- Shows: original text, attachments, connected ideas
- Edit mode: text editable, attachments manageable
- Close: X button, Close button, Escape key, click outside

**Move Idea**:
- Click and drag idea
- Cursor changes to "grabbing"
- Idea becomes semi-transparent (60%)
- Follows mouse position
- If overlaps another idea (>30% area):
  - Both ideas highlight
  - Visual indicator: "Drop to connect"
- On release:
  - If overlapping: edge creation modal
  - If not: position updated
- Position saved to database (debounced 300ms)

**Delete Idea**:
- Click ✕ button (in peak view)
- Idea removed immediately
- Deleted from database
- All connected edges deleted (CASCADE)
- Added to undo stack

**Parent Indicator**:
- Ideas with children get gold stroke (2px, #FFD700)
- Indicates "this is a parent node"
- Appears in all view states

**Summarization**:
- Triggered if text > 50 characters or > 2 lines
- OpenAI GPT-4 API called with specific prompt
- Summary max 50 characters
- Fallback: truncate if API fails
- Retry logic: 3 attempts with exponential backoff

**Embeddings**:
- Generated for all ideas (background, silent)
- OpenAI text-embedding-3-small (1536 dimensions)
- Stored in database for future similarity search
- Batch processing (up to 10 at once)
- Fails silently (logs error, continues)

### 4.5 Edge System

**Create Edge**:
- Drag Idea A onto Idea B
- Both ideas highlight during overlap
- On release: edge creation modal appears
- Modal shows:
  - From: Idea A (child)
  - To: Idea B (parent)
  - Relationship type selector (6 defaults + custom)
- User selects type
- Edge created in database
- Edge rendered on canvas

**Edge Types** (default):
- `related_to` - General association
- `prerequisite_for` - Parent must be completed before child
- `inspired_by` - Child idea came from parent
- `blocks` - Parent is blocking progress on child
- `similar_to` - Ideas are similar in nature
- `depends_on` - Child depends on parent

**Custom Edge Types**:
- User can click "+ Add New Type"
- Modal appears for name input
- New type saved to database
- Immediately available in dropdown
- Reusable across all brain dumps

**Display Edge**:
- Black line (light mode) or white (dark mode)
- 2px base width
- Rounded ends
- Parent endpoint: thin (2px circle)
- Child endpoint: thick (8px wide cap)
- Width difference indicates direction

**Edge Label**:
- Text at midpoint of line
- Small font (10px)
- Semi-transparent background
- Only visible on hover (reduces clutter)

**Edge Interaction**:
- **Hover**: line thickens (3px), label appears, × button appears
- **Double-click**: opens note modal (add context about relationship)
- **Delete**: click × button or press Delete key

**Edge Constraints**:
- Each idea can have 0 or 1 parent
- Each idea can have 0 to unlimited children
- No self-references (idea connecting to itself)
- No circular relationships (A→B→C→A)
- If child already has parent: show warning, allow replacement

### 4.6 Attachments

**Supported Types**:
- Images: PNG, JPG, GIF, WebP
- Documents: PDF, TXT
- URLs: Any valid HTTP/HTTPS link

**Add Attachment**:
- Drag file onto quick input
- Or paste URL
- File uploads to Supabase Storage
- Reference stored in database
- Thumbnail generated for images

**URL Metadata**:
- When URL pasted, fetch metadata (title, description, favicon)
- Display rich preview in attachment widget
- Timeout after 5 seconds if fetch fails
- Store metadata for display in modal

**Display Attachment**:
- In quick input: small widget with icon/thumbnail + filename
- In modal: larger preview with click to view full size
- Images: show thumbnail
- PDFs: show first page thumbnail
- URLs: show favicon + title + description

**Remove Attachment**:
- Hover over attachment widget
- Click X button
- Attachment removed from list
- File remains in storage (cleanup later)

### 4.7 Undo/Redo

**Scope**:
- Per brain dump (each has own history)
- Database-persisted (deleted items are restored from database)
- Max 50 actions in stack (configurable)
- 100ms debounce to prevent excessive snapshots

**Covered Actions**:
- Move idea (position change)
- Create idea
- Delete idea (restores from database)
- Edit idea text
- Create edge
- Delete edge (restores from database)
- Cascade deletes (edges deleted with parent idea)

**Implementation Details**:
- **UndoRedoManager**: Custom class managing history stacks
- **Automatic Tracking**: Zustand subscription captures state changes
- **Database Sync**: Async upsert operations restore deleted items
- **Deep Cloning**: Prevents reference issues in history
- **Foreign Key Handling**: Ideas restored before edges (dependency order)

**Keyboard Shortcuts**:
- Ctrl+Z (Cmd+Z on Mac): Undo
- Ctrl+Shift+Z (Cmd+Shift+Z on Mac): Redo
- Works globally except in input fields

**UI Controls**:
- Undo/Redo buttons in top-right corner
- Disabled when no actions available
- Tooltips show keyboard shortcuts
- Icon indicators (⟲ Undo, ⟳ Redo)

**Behavior**:
- Undo: reverse last action, restore from database if needed, add to redo stack
- Redo: reapply last undone action, sync with database, add to undo stack
- New action: clear redo stack
- Switch brain dump: clear both stacks

---

## 5. Advanced Features

### 5.1 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+Z** / **Cmd+Z** | Undo last action |
| **Ctrl+Shift+Z** / **Cmd+Shift+Z** | Redo last undone action |
| **Ctrl+N** | Create new brain dump |
| **Ctrl+D** | Duplicate current brain dump |
| **Ctrl+/** | Toggle side panel |
| **Ctrl+G** | Toggle grid visibility |
| **Ctrl+Shift+T** | Toggle theme (light/dark) |
| **Ctrl+0** | Reset canvas view (zoom 100%, center) |
| **Escape** | Close modal / Clear input / Deselect |
| **Delete** | Delete selected ideas/edges |
| **Ctrl+A** | Select all ideas on canvas |
| **Enter** | Submit idea (in input box) |
| **Shift+Enter** | New line (in input box) |
| **Any letter/number** | Auto-focus input box and start typing |

### 5.2 Multi-Select

**Trigger**: Drag on empty canvas (no modifier)

**Behavior**:
- Creates selection rectangle
- All ideas within rectangle selected
- Selected ideas highlighted (blue border)
- Can move all selected ideas together
- Can delete all selected ideas with Delete key

### 5.3 Theme System

**Light Mode**:
- Background: white/light gray
- Text: dark gray/black
- Grid: dark gray (semi-transparent)
- Ideas: white background, dark border
- Edges: black

**Dark Mode**:
- Background: dark gray/black
- Text: white/light gray
- Grid: light gray (semi-transparent)
- Ideas: dark gray background, light border
- Edges: white

**Toggle**: Control panel dropdown or Ctrl+Shift+T

**Persistence**: Saved in localStorage, applies to all brain dumps

---

## 6. API Structure

### 6.1 Brain Dumps

**GET /api/brain-dumps**
- List all brain dumps (excluding archived)
- Query params: `include_archived=true` (optional)
- Response: `{ brainDumps: [...] }`

**POST /api/brain-dumps**
- Create new brain dump
- Body: `{ name: string }`
- Response: `{ id, name, created_at, viewport_x, viewport_y, viewport_zoom }`

**GET /api/brain-dumps/:id**
- Get brain dump details
- Response: `{ id, name, created_at, idea_count, ... }`

**PATCH /api/brain-dumps/:id**
- Update brain dump (name, viewport)
- Body: `{ name?, viewport_x?, viewport_y?, viewport_zoom? }`
- Response: updated brain dump

**DELETE /api/brain-dumps/:id**
- Soft delete (set archived_at)
- Response: `{ success: true }`

**POST /api/brain-dumps/:id/duplicate**
- Duplicate brain dump with all ideas and edges
- Response: new brain dump object

### 6.2 Ideas

**GET /api/brain-dumps/:id/ideas**
- Get all ideas in brain dump
- Response: `{ ideas: [...] }`

**POST /api/ideas**
- Create new idea
- Body: `{ brainDumpId, text, positionX, positionY, attachments? }`
- Response: `{ id, text, summary, state, ... }`

**GET /api/ideas/:id**
- Get idea details
- Response: `{ id, text, summary, attachments, parent, children, ... }`

**PATCH /api/ideas/:id**
- Update idea (text, position, etc.)
- Body: `{ text?, positionX?, positionY?, ... }`
- Response: updated idea

**DELETE /api/ideas/:id**
- Delete idea (CASCADE deletes edges)
- Response: `{ success: true }`

**GET /api/ideas/:id/similar**
- Find similar ideas using embeddings
- Query params: `limit=10`
- Response: `{ similar: [{ id, text, similarity }, ...] }`

**GET /api/ideas/:id/children**
- Get child ideas
- Response: `{ children: [...] }`

**GET /api/ideas/:id/parent**
- Get parent idea
- Response: `{ parent: {...} }` or `{ parent: null }`

### 6.3 Edges

**POST /api/edges**
- Create edge between ideas
- Body: `{ brainDumpId, parentId, childId, type, note? }`
- Validates: no cycles, max 1 parent per child
- Response: `{ id, parentId, childId, type, note }`

**PATCH /api/edges/:id**
- Update edge (type, note)
- Body: `{ type?, note? }`
- Response: updated edge

**DELETE /api/edges/:id**
- Delete edge
- Response: `{ success: true }`

**GET /api/edge-types**
- Get all edge types (default + custom)
- Response: `{ types: ['related_to', 'depends_on', ...] }`

**POST /api/edge-types**
- Create custom edge type
- Body: `{ name }`
- Response: `{ id, name, is_default }`

### 6.4 Attachments

**POST /api/attachments**
- Upload attachment
- Body: multipart/form-data with file
- Response: `{ id, ideaId, type, url, filename }`

**DELETE /api/attachments/:id**
- Delete attachment
- Response: `{ success: true }`

---

## 7. Technical Requirements

### 7.1 Performance

| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Idea creation (UI) | <100ms | 200ms |
| File upload & attachment creation | <2s | 5s |
| Canvas pan/zoom | 60 FPS | 30 FPS |
| Brain dump switch | <1s | 2s |
| Summarization | <3s | 5s |
| Embedding generation | <2s | 5s |
| Database query | <200ms | 500ms |
| Thumbnail generation | <500ms | 1s |

### 7.2 Scalability

**Ideas per Brain Dump**:
- Target: 500 ideas (smooth performance)
- Max: 1000 ideas (acceptable with viewport culling)

**Edges per Idea**:
- Target: 10 edges
- Max: 50 edges

**Brain Dumps Total**:
- Target: 20 brain dumps
- Max: 100 brain dumps

### 7.3 Browser Support

**Desktop Only** (for MVP):
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Not Supported**:
- Mobile browsers
- Tablets
- Internet Explorer

### 7.4 Optimization Techniques

**Viewport Culling**:
- Only render ideas within visible area + 500px buffer
- Reduces rendered elements from 1000 to ~50

**Debouncing**:
- Position updates: 300ms
- Viewport saves: 5s

**Memoization**:
- Edge path calculations
- Visible ideas calculation
- Component renders (React.memo)

**Lazy Loading**:
- Brain dumps loaded on-demand
- Embeddings generated asynchronously
- Attachments loaded on modal open

---

## 8. Error Handling

### 8.1 AI Failures

**Summarization Fails**:
- Fallback: truncate text to 50 chars + "..."
- Log error to monitoring
- Show original text in modal
- Don't block user

**Embedding Fails**:
- Log error to monitoring
- Continue without embedding
- Future features (similarity search) won't work for this idea
- Don't show error to user

### 8.2 Database Errors

**Connection Lost**:
- Show toast: "Connection lost. Retrying..."
- Queue operations in memory
- Retry every 5 seconds
- Sync when connection restored

**Query Timeout**:
- Retry up to 3 times
- If still failing, show error message
- Allow user to continue with cached data

**Constraint Violation**:
- Show user-friendly error message
- Example: "This idea already has a parent. Replace existing parent?"
- Rollback optimistic UI update

### 8.3 File Upload Errors

**File Too Large**:
- Max size: 10MB
- Show error: "File too large. Max 10MB."
- Don't upload

**Invalid File Type**:
- Show error: "Unsupported file type"
- List supported types

**Upload Failed**:
- Retry up to 3 times
- If still failing, show error
- Allow user to remove and re-add

### 8.4 User Feedback

**Toast Notifications**:
- Position: bottom-right corner
- Duration: 3 seconds (auto-dismiss)
- Types: success, error, info, warning

---

## 9. Testing Requirements

### 9.1 Critical User Flows to Test

1. Create brain dump → Add idea → Move idea → Create edge
2. Create idea with attachment → View in modal → Edit
3. Create 100 ideas → Pan/zoom → Select multiple → Delete
4. Switch brain dumps → Verify viewport restored
5. Undo/redo multiple actions

### 9.2 Performance Tests

**Load Testing**:
- 500 ideas on canvas
- 200 edges
- Measure FPS during pan/zoom

**Stress Testing**:
- 1000 ideas on canvas
- 500 edges
- Verify no crashes or freezes

---

## 10. Success Criteria

**MVP is complete when**:

1. ✅ User can create brain dumps and switch between them
2. ✅ User can add ideas via quick input
3. ✅ Ideas appear instantly on canvas
4. ✅ Long ideas are automatically summarized within 5 seconds
5. ✅ User can move ideas around smoothly (60 FPS)
6. ✅ User can create edges by dragging ideas together
7. ✅ Edges display with correct parent-child direction
8. ✅ User can view idea details in modal
9. ✅ User can attach files and URLs to ideas
10. ✅ Undo/redo works for all actions
11. ✅ All keyboard shortcuts work
12. ✅ Canvas performs well with 500+ ideas
13. ✅ No critical bugs or crashes
14. ✅ Error handling works gracefully

**Definition of "Done"**:
- Feature implemented and tested
- Code reviewed (if team > 1)
- No known critical bugs
- Performance meets requirements
- Documentation updated

