# Brain Dump Canvas - Frontend Migration Plan

**Date Created**: November 1, 2025

---

## 📋 Executive Summary

This plan outlines the migration of the fully-featured Vite/React frontend (Dumpfigma) to the Next.js 14 framework while preserving the existing backend infrastructure and database schema.

### Key Objectives
1. ✅ Keep existing Next.js backend API routes and database
2. ✅ Migrate all frontend components from Vite/React to Next.js App Router
3. ✅ Replace Konva.js canvas with DOM/SVG-based canvas implementation
4. ✅ Implement Supabase Authentication flow
5. ✅ Preserve all advanced features (themes, liquid glass UI, edges, attachments)
6. ✅ Unify state management under a single Zustand store architecture

---

## 🔍 Analysis: Current State Comparison

### State Management Differences

| Aspect | Dumpfigma (Source) | Next.js (Target) | Action Required |
|--------|-------------------|------------------|-----------------|
| **Store Structure** | Single unified store | Sliced store (4 slices) | **Migrate to unified** |
| **Ideas Storage** | `Map<string, Idea>` | Array | **Convert to Map** |
| **Brain Dump Concept** | Fully implemented | Partially implemented | **Complete implementation** |
| **Auth State** | Managed in store | Not present | **Add auth state** |
| **Theme System** | 8 themes with liquid glass | Basic theme toggle | **Migrate theme system** |
| **Edge System** | Full edge management | Basic edges | **Enhance edge system** |
| **Undo/Redo** | Not implemented | Implemented | **Keep and integrate** |

### Canvas Technology

| Aspect | Dumpfigma | Next.js | Decision |
|--------|-----------|---------|----------|
| **Rendering** | DOM/SVG | Konva.js | **Replace with DOM/SVG** |
| **Pan/Zoom** | CSS transforms | Konva transforms | **Use CSS transforms** |
| **Selection** | Box selection with Set | Konva selection | **Use Set-based selection** |
| **Performance** | Transform-based | Canvas-based | **Optimize transforms** |

### Component Inventory

**Dumpfigma Components to Migrate:**
- ✅ LoginPage.tsx (NEW - Auth UI)
- ✅ Canvas.tsx (Replace Konva version)
- ✅ IdeaNode.tsx (Replace Idea.tsx)
- ✅ EdgeRenderer.tsx (Replace Edge.tsx)
- ✅ ConnectionLine.tsx (NEW - Edge creation)
- ✅ InputBox.tsx (Enhance QuickInput.tsx)
- ✅ SidePanel.tsx (Replace existing)
- ✅ Toolbar.tsx (NEW - Zoom/theme controls)
- ✅ DetailModal.tsx (NEW - Idea details)
- ✅ CanvasHeader.tsx (Enhance existing)
- ✅ EmptyState.tsx (NEW)
- ✅ BackendStatus.tsx (NEW)
- ✅ BrainDumpIcon.tsx (NEW)
- ✅ GradientBorder.tsx (NEW)

**Existing Next.js Components:**
- ⚠️ Canvas.tsx - To be replaced
- ⚠️ Idea.tsx - To be replaced with IdeaNode
- ⚠️ Edge.tsx - To be replaced with EdgeRenderer
- ⚠️ Grid.tsx - Integrate into new Canvas
- ✅ KeyboardShortcutsModal.tsx - Keep
- ✅ SettingsModal.tsx - Keep and enhance
- ⚠️ QuickInput.tsx - Enhance with Dumpfigma features
- ⚠️ SidePanel.tsx - Replace with Dumpfigma version
- ⚠️ CanvasHeader.tsx - Enhance with Dumpfigma features
- ✅ ThemeProvider.tsx - Enhance with new themes
- ✅ ControlPanel.tsx - Evaluate if needed

---

## 📦 Phase 1: Foundation & Setup (Day 1)

### 1.1 Environment Configuration
**Goal**: Ensure Supabase configuration is properly set up for Next.js

**Tasks**:
- [ ] Create `.env.local` with Supabase credentials
  ```env
  NEXT_PUBLIC_SUPABASE_PROJECT_ID=qnrwfaroycqdlaruddfv
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- [ ] Create `src/lib/supabase/client.ts` - Singleton Supabase client
- [ ] Create `src/lib/supabase/server.ts` - Server-side Supabase client (for SSR)
- [ ] Verify Edge Function endpoint is accessible

**Validation**:
- Can create Supabase client successfully
- Can make authenticated requests to Edge Functions
- Environment variables load correctly in both client and server

### 1.2 Install Missing Dependencies
**Goal**: Add all required packages from Dumpfigma

**Tasks**:
- [ ] Install missing Radix UI components:
  ```bash
  npm install @radix-ui/react-accordion \
    @radix-ui/react-alert-dialog \
    @radix-ui/react-dialog \
    @radix-ui/react-dropdown-menu \
    @radix-ui/react-label \
    @radix-ui/react-popover \
    @radix-ui/react-scroll-area \
    @radix-ui/react-separator \
    @radix-ui/react-slot \
    @radix-ui/react-tooltip
  ```
- [ ] Install utility libraries:
  ```bash
  npm install class-variance-authority clsx tailwind-merge sonner
  ```
- [ ] Verify `zustand` is already installed
- [ ] Verify `lucide-react` is installed or install it

**Validation**:
- All packages install without errors
- No conflicting versions
- TypeScript types are available

### 1.3 Copy UI Components
**Goal**: Establish base UI component library

**Tasks**:
- [ ] Copy entire `Dumpfigma/src/components/ui/` directory to `src/components/ui/`
- [ ] Update import paths in copied components:
  - Change `@/components/ui/` imports to use new location
  - Update `@/lib/utils` imports if needed
- [ ] Create `src/lib/utils.ts` if not exists (for cn() function)

**Validation**:
- All UI components compile without errors
- No missing imports
- TypeScript validation passes

---

## 📦 Phase 2: Styling System Migration (Day 1-2)

### 2.1 Merge CSS Variables
**Goal**: Consolidate all CSS variable definitions

**Tasks**:
- [ ] Open `Dumpfigma/src/styles/globals.css` and `Dumpfigma/src/index.css`
- [ ] Open `src/app/globals.css`
- [ ] Merge all CSS variable definitions:
  - Color variables (--background, --foreground, etc.)
  - Liquid glass variables (--glass-bg, --glass-blur, etc.)
  - Radius and spacing variables
  - Theme-specific variables
- [ ] Add utility classes:
  ```css
  .liquid-glass {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
  }
  
  .liquid-glass-border {
    background: linear-gradient(135deg, 
      rgba(168, 85, 247, 0.4) 0%, 
      rgba(59, 130, 246, 0.4) 100%);
    padding: 2px;
  }
  ```

**Validation**:
- CSS variables are defined and accessible
- Utility classes work as expected
- No style conflicts with existing styles

### 2.2 Migrate Theme System
**Goal**: Implement 8-theme system with utilities

**Tasks**:
- [ ] Copy `Dumpfigma/src/utils/themes.ts` to `src/lib/themes.ts`
- [ ] Update imports to use Next.js path aliases
- [ ] Verify all theme definitions are complete:
  - `light`, `gradient-purple`, `gradient-ocean`, `gradient-sunset`
  - `gradient-forest`, `dots-light`, `dots-dark`, `waves`
- [ ] Test theme utility functions:
  - `getThemeTextColor(theme)`
  - `getThemeGlassStyle(theme)`
  - `getLiquidGlassStyle(theme)`

**Validation**:
- All 8 themes render correctly
- Theme utilities return correct values
- Text colors adjust based on theme darkness

---

## 📦 Phase 3: State Management Overhaul (Day 2-3)

### 3.1 Create Unified Store Structure
**Goal**: Replace sliced store with unified Zustand store

**Tasks**:
- [ ] **BACKUP**: Create `src/store/backup/` and copy existing store files
- [ ] Copy `Dumpfigma/src/store/canvas-store.ts` to `src/store/canvas-store.ts`
- [ ] Update imports:
  - Change `../utils/api` to `@/lib/api`
  - Change `../utils/auth-helpers` to `@/lib/auth-helpers`
  - Change `../utils/demo-data` to `@/lib/demo-data`
- [ ] Integrate undo/redo functionality from existing `src/store/index.ts`:
  ```typescript
  // Add to canvas-store.ts
  undo: () => { /* implementation */ },
  redo: () => { /* implementation */ },
  canUndo: () => boolean,
  canRedo: () => boolean,
  ```

**Critical Changes**:
1. **Ideas Storage**: Change from `Idea[]` to `Map<string, Idea>`
   ```typescript
   // Old (slices)
   ideas: Idea[]
   
   // New (unified)
   ideas: Map<string, Idea>
   ```

2. **Brain Dump Structure**:
   ```typescript
   interface BrainDump {
     id: string;
     name: string;
     ideas: Map<string, Idea>;  // Key change
     edges: Edge[];
     panX: number;
     panY: number;
     zoom: number;
     createdAt: number;
     updatedAt: number;
   }
   ```

3. **Selection State**: Use `Set` instead of arrays
   ```typescript
   selectedIds: Set<string>;
   selectedEdgeIds: Set<string>;
   ```

**Tasks**:
- [ ] Replace `src/store/index.ts` with new unified store export
- [ ] Delete or archive old slice files
- [ ] Update all component imports from `useStore` to use new store structure

**Validation**:
- Store compiles without errors
- Can create and access brain dumps
- Selection state works with Sets
- Ideas stored as Map
- Undo/redo functionality integrated

### 3.2 Update Type Definitions
**Goal**: Consolidate type definitions

**Tasks**:
- [ ] Open `src/types/index.ts`
- [ ] Merge with types from `canvas-store.ts`:
  - `Attachment` interface
  - `Idea` interface (update to match Dumpfigma)
  - `Edge` interface (update to match Dumpfigma)
  - `BrainDump` interface
  - `ThemeType` union
- [ ] Ensure consistency with database schema
- [ ] Export all types from `src/types/index.ts`

**Validation**:
- All types are defined and exported
- No duplicate type definitions
- Types match database schema

---

## 📦 Phase 4: Utility Functions & API Layer (Day 3)

### 4.1 Migrate Utility Functions
**Goal**: Copy all utility functions from Dumpfigma

**Tasks**:
- [ ] Copy `Dumpfigma/src/utils/api.ts` to `src/lib/api.ts`
  - Update imports
  - Verify Edge Function endpoint URL
  - Ensure Map serialization/deserialization works:
    ```typescript
    // Serialize: Array.from(ideas.entries())
    // Deserialize: new Map(ideas || [])
    ```
- [ ] Copy `Dumpfigma/src/utils/auth-helpers.ts` to `src/lib/auth-helpers.ts`
  - Update Supabase client imports
  - Verify session validation logic
- [ ] Copy `Dumpfigma/src/utils/geometry.ts` to `src/lib/geometry.ts`
  - Used for canvas collision detection
- [ ] Copy `Dumpfigma/src/utils/demo-data.ts` to `src/lib/demo-data.ts`
  - Creates welcome demo for new users

**Validation**:
- API functions can make authenticated requests
- Session validation works correctly
- Geometry functions calculate correctly
- Demo data can be generated

### 4.2 Verify Backend Compatibility
**Goal**: Ensure frontend API calls work with existing Next.js backend

**Tasks**:
- [ ] Compare API routes in `src/app/api/` with expected endpoints from `api.ts`
- [ ] Verify endpoint compatibility:
  - `GET /brain-dumps` - List brain dumps
  - `POST /brain-dumps` - Create/update brain dump
  - `DELETE /brain-dumps/:id` - Delete brain dump
- [ ] Test Map serialization in API calls
- [ ] Ensure authentication headers are included

**Potential Issues**:
- ⚠️ Dumpfigma uses Edge Function: `make-server-2e3c1d79`
- ⚠️ Next.js might have different API route structure
- **Decision Point**: Keep Edge Functions OR migrate to Next.js API routes

**Validation**:
- Can load brain dumps from backend
- Can save brain dumps to backend
- Can delete brain dumps
- Map data serializes/deserializes correctly

---

## 📦 Phase 5: Authentication System (Day 4)

### 5.1 Create Supabase Client Utilities
**Goal**: Set up proper Supabase client for Next.js

**Tasks**:
- [ ] Create `src/lib/supabase/client.ts`:
  ```typescript
  'use client'
  
  import { createClient } from '@supabase/supabase-js'
  
  const supabaseUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  export const supabase = createClient(supabaseUrl, supabaseAnonKey)
  ```
- [ ] Create `src/lib/supabase/server.ts` (for future SSR needs):
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  import { cookies } from 'next/headers'
  
  // Server-side client with cookies
  ```

**Validation**:
- Client can be imported in components
- Environment variables are accessible
- No multiple client instances created

### 5.2 Implement Auth Flow
**Goal**: Add authentication to Next.js app

**Tasks**:
- [ ] Copy `Dumpfigma/src/components/LoginPage.tsx` to `src/components/LoginPage.tsx`
  - Add `'use client'` directive
  - Update imports
  - Update Button, Input, Label imports
- [ ] Create `src/app/login/page.tsx`:
  ```typescript
  'use client'
  import LoginPage from '@/components/LoginPage'
  
  export default function Login() {
    return <LoginPage />
  }
  ```
- [ ] Update `src/app/page.tsx` to check authentication:
  ```typescript
  'use client'
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        // Load user into store
      }
    }
    checkAuth()
  }, [])
  ```

**Validation**:
- Login page renders correctly
- Can sign up with email/password
- Can sign in with email/password
- Google OAuth works
- Session persists across refreshes
- Unauthorized users redirect to login

### 5.3 Add Auth to Store
**Goal**: Integrate auth state with Zustand store

**Tasks**:
- [ ] Verify `currentUser` and `accessToken` in store
- [ ] Implement `setCurrentUser(user, token)` action
- [ ] Implement `logout()` action
- [ ] Connect authentication to brain dump loading:
  ```typescript
  setCurrentUser: async (user, token) => {
    set({ currentUser: user, accessToken: token });
    
    // Auto-load brain dumps after auth
    const brainDumps = await loadBrainDumps(token);
    // ... process and set brain dumps
  }
  ```

**Validation**:
- User state updates after login
- Access token is stored securely
- Brain dumps load after authentication
- Logout clears all state

---

## 📦 Phase 6: Canvas System Migration (Day 4-5)

### 6.1 Remove Konva Dependencies
**Goal**: Clean up Konva-based canvas implementation

**Tasks**:
- [ ] **BACKUP**: Copy existing canvas files to `src/components/backup/`
- [ ] Remove Konva packages:
  ```bash
  npm uninstall react-konva konva
  ```
- [ ] Delete or move:
  - `src/components/Canvas.tsx` (old Konva version)
  - `src/components/Idea.tsx` (old Konva version)
  - `src/components/Edge.tsx` (old Konva version)
  - `src/components/Grid.tsx` (will integrate into new Canvas)

**Validation**:
- No Konva imports remain
- No compilation errors from missing Konva
- Backup files saved

### 6.2 Migrate Canvas Component
**Goal**: Implement DOM/SVG-based canvas

**Tasks**:
- [ ] Copy `Dumpfigma/src/components/Canvas.tsx` to `src/components/Canvas.tsx`
  - Add `'use client'` directive at top
  - Update imports:
    - `IdeaNode` from `@/components/IdeaNode`
    - `EdgeRenderer` from `@/components/EdgeRenderer`
    - `ConnectionLine` from `@/components/ConnectionLine`
    - Store from `@/store/canvas-store`
    - Themes from `@/lib/themes`
    - Geometry from `@/lib/geometry`
  - Review and integrate Grid rendering from old `Grid.tsx`

**Key Features to Verify**:
- ✅ Pan and zoom with mouse/trackpad
- ✅ Box selection
- ✅ Keyboard shortcuts (Delete/Backspace)
- ✅ Pinch-to-zoom
- ✅ Grid overlay
- ✅ Transform-based rendering

**Canvas Structure**:
```tsx
<div
  ref={canvasRef}
  className="relative w-full h-full overflow-hidden"
  style={{ 
    background: theme.gradient || theme.backgroundColor,
    touchAction: 'none'
  }}
>
  {/* Grid Layer */}
  {showGrid && <div className="grid-overlay" />}
  
  {/* Transform Container */}
  <div
    style={{
      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
      transformOrigin: '0 0',
      width: '100%',
      height: '100%'
    }}
  >
    {/* Ideas */}
    {Array.from(ideas.values()).map(idea => (
      <IdeaNode key={idea.id} {...idea} />
    ))}
  </div>
  
  {/* SVG Layer for Edges */}
  <EdgeRenderer />
  
  {/* Connection Line (during edge creation) */}
  {isCreatingConnection && <ConnectionLine />}
  
  {/* Box Selection Overlay */}
  {boxSelection && <div className="selection-box" />}
</div>
```

**Validation**:
- Canvas renders without errors
- Pan and zoom work smoothly
- Ideas are positioned correctly
- Grid displays when enabled
- Transform performance is acceptable

### 6.3 Migrate IdeaNode Component
**Goal**: Replace Idea.tsx with IdeaNode.tsx

**Tasks**:
- [ ] Copy `Dumpfigma/src/components/IdeaNode.tsx` to `src/components/IdeaNode.tsx`
  - Add `'use client'` directive
  - Update imports
  - Verify props match new Idea type
- [ ] Implement features:
  - ✅ Draggable with position updates to store
  - ✅ Single-click selection
  - ✅ Cmd/Ctrl+Click multi-select
  - ✅ Double-click to open detail modal
  - ✅ Connection handle on hover
  - ✅ Attachment indicators
  - ✅ Liquid glass styling

**Validation**:
- Ideas render correctly
- Drag and drop works
- Selection works (single and multi)
- Double-click opens modal
- Connection handle appears on hover

### 6.4 Migrate Edge System
**Goal**: Implement full edge rendering and management

**Tasks**:
- [ ] Copy `Dumpfigma/src/components/EdgeRenderer.tsx` to `src/components/EdgeRenderer.tsx`
  - Add `'use client'` directive
  - Update imports
- [ ] Copy `Dumpfigma/src/components/ConnectionLine.tsx` to `src/components/ConnectionLine.tsx`
  - Add `'use client'` directive
  - Update imports
- [ ] Implement edge features:
  - ✅ SVG-based rendering
  - ✅ Curved paths
  - ✅ Relationship type labels
  - ✅ Click to select
  - ✅ Highlight during creation
  - ✅ Delete by crossing during creation
  - ✅ Arrow markers

**Edge Creation Flow**:
1. Click connection handle on source idea
2. Store sets `isCreatingConnection: true` and `connectionSourceId: ideaId`
3. `ConnectionLine` component shows dashed line from source to mouse cursor
4. As mouse moves over ideas, detect and highlight potential targets
5. If hovering over valid target, show "new edge" label
6. If hovering over existing connection between same ideas, show red line (delete mode)
7. On click over valid target: create edge
8. On click over existing edge: delete edge
9. On escape or outside click: cancel connection

**Validation**:
- Edges render between connected ideas
- Edge creation works by dragging from connection handle
- Can delete edges by crossing them during creation
- Edge labels display correctly
- Selected edges highlight

---

## 📦 Phase 7: Remaining Components (Day 5-6)

### 7.1 Migrate Core UI Components
**Goal**: Replace/enhance existing components with Dumpfigma versions

#### InputBox Component
- [ ] Copy `Dumpfigma/src/components/InputBox.tsx` to `src/components/InputBox.tsx`
- [ ] Replace existing `QuickInput.tsx` or enhance it
- [ ] Features to implement:
  - Always visible at bottom
  - Enter to submit
  - Drag and drop file support
  - Spiral placement algorithm
  - Liquid glass styling

#### SidePanel Component
- [ ] Copy `Dumpfigma/src/components/SidePanel.tsx` to `src/components/SidePanel.tsx`
- [ ] Replace existing version
- [ ] Features:
  - Resizable width (60px - 400px)
  - Collapsible to icon-only
  - Brain dump list with actions
  - User profile and logout
  - Liquid glass styling

#### Toolbar Component (NEW)
- [ ] Copy `Dumpfigma/src/components/Toolbar.tsx` to `src/components/Toolbar.tsx`
- [ ] Features:
  - Zoom controls
  - Theme switcher
  - Grid toggle
  - Bulk delete
  - Responsive mobile menu

#### CanvasHeader Component
- [ ] Copy `Dumpfigma/src/components/CanvasHeader.tsx` to enhance existing
- [ ] Merge features:
  - Editable brain dump name
  - Idea count display
  - User welcome message
  - Liquid glass styling

**Validation**:
- All components render correctly
- Features work as expected
- Styling matches Dumpfigma design
- No prop type mismatches

### 7.2 Migrate Modal Components
**Goal**: Add detail modal and enhance existing modals

#### DetailModal (NEW)
- [ ] Copy `Dumpfigma/src/components/DetailModal.tsx` to `src/components/DetailModal.tsx`
- [ ] Features:
  - Full-screen modal
  - Edit idea text
  - Display attachments
  - Show relationship tree
  - Navigate between related ideas
  - Delete confirmation

#### Enhance Existing Modals
- [ ] Update `KeyboardShortcutsModal.tsx`:
  - Add shortcuts from Dumpfigma
  - Update styling to match liquid glass
- [ ] Update `SettingsModal.tsx`:
  - Add theme selection (8 themes)
  - Add user preferences
  - Liquid glass styling

**Validation**:
- DetailModal opens when double-clicking idea
- Can edit idea text in modal
- Relationship tree displays correctly
- Keyboard shortcuts modal shows all shortcuts
- Settings modal includes all new options

### 7.3 Migrate Utility Components
**Goal**: Add supporting components

- [ ] Copy `Dumpfigma/src/components/EmptyState.tsx` to `src/components/EmptyState.tsx`
  - Show when user has no brain dumps
- [ ] Copy `Dumpfigma/src/components/BackendStatus.tsx` to `src/components/BackendStatus.tsx`
  - Health check indicator
- [ ] Copy `Dumpfigma/src/components/BrainDumpIcon.tsx` to `src/components/BrainDumpIcon.tsx`
  - Reusable icon component
- [ ] Copy `Dumpfigma/src/components/GradientBorder.tsx` to `src/components/GradientBorder.tsx`
  - Styling utility component

**Validation**:
- EmptyState shows when appropriate
- BackendStatus indicates connection health
- Icons render correctly
- Gradient borders work

---

## 📦 Phase 8: Route Structure & Navigation (Day 6)

### 8.1 Create Route Structure
**Goal**: Organize Next.js App Router for auth and main app

**New Structure**:
```
src/app/
├── layout.tsx              # Root layout
├── page.tsx                # Main canvas (auth protected)
├── login/
│   └── page.tsx           # Login/signup page
├── globals.css            # Updated with all CSS variables
└── api/                   # Keep existing API routes
    ├── brain-dumps/
    ├── ideas/
    ├── edges/
    └── attachments/
```

**Tasks**:
- [ ] Update `src/app/page.tsx`:
  ```typescript
  'use client'
  
  import { useEffect } from 'react'
  import { useRouter } from 'next/navigation'
  import { useStore } from '@/store/canvas-store'
  import Canvas from '@/components/Canvas'
  import CanvasHeader from '@/components/CanvasHeader'
  import InputBox from '@/components/InputBox'
  import SidePanel from '@/components/SidePanel'
  import Toolbar from '@/components/Toolbar'
  import DetailModal from '@/components/DetailModal'
  import EmptyState from '@/components/EmptyState'
  
  export default function Home() {
    const router = useRouter()
    const currentUser = useStore(state => state.currentUser)
    const brainDumps = useStore(state => state.brainDumps)
    
    useEffect(() => {
      // Auth check
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
        } else {
          // Set user in store
          const user = { id: session.user.id, email: session.user.email }
          useStore.getState().setCurrentUser(user, session.access_token)
        }
      }
      checkAuth()
    }, [router])
    
    // Show empty state if no brain dumps
    if (brainDumps.size === 0) {
      return <EmptyState />
    }
    
    return (
      <div className="flex h-screen">
        <SidePanel />
        <div className="flex-1 relative">
          <Canvas />
          <CanvasHeader />
          <InputBox />
          <Toolbar />
        </div>
        <DetailModal />
      </div>
    )
  }
  ```

- [ ] Create `src/app/login/page.tsx`:
  ```typescript
  'use client'
  
  import LoginPage from '@/components/LoginPage'
  
  export default function Login() {
    return <LoginPage />
  }
  ```

**Validation**:
- Unauthenticated users redirect to /login
- Authenticated users see canvas
- Empty state shows when no brain dumps exist
- Navigation works correctly

### 8.2 Add Middleware for Auth Protection
**Goal**: Protect routes at the middleware level

**Tasks**:
- [ ] Create `src/middleware.ts`:
  ```typescript
  import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'
  
  export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()
    
    // Protect main app routes
    if (!session && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    
    // Redirect to main app if already logged in
    if (session && req.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    return res
  }
  
  export const config = {
    matcher: ['/', '/login']
  }
  ```

**Validation**:
- Middleware protects main page
- Login redirects to main page after successful auth
- Session is properly validated

---

## 📦 Phase 9: Testing & Refinement (Day 7)

### 9.1 Feature Testing Checklist
**Goal**: Verify all features work correctly

#### Authentication
- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with Google OAuth
- [ ] Session persists across page refreshes
- [ ] Logout works correctly
- [ ] Unauthorized access redirects to login

#### Brain Dump Management
- [ ] Can create new brain dump
- [ ] Can rename brain dump
- [ ] Can delete brain dump
- [ ] Can switch between brain dumps
- [ ] Brain dumps save automatically
- [ ] Brain dumps load from database

#### Canvas Interaction
- [ ] Can pan canvas with mouse drag
- [ ] Can zoom with mouse wheel
- [ ] Can zoom with trackpad pinch
- [ ] Grid displays correctly
- [ ] Box selection works
- [ ] Keyboard shortcuts work (Delete/Backspace)

#### Idea Management
- [ ] Can create idea via InputBox
- [ ] Can drag and reposition ideas
- [ ] Can select single idea
- [ ] Can multi-select ideas (Cmd/Ctrl+Click)
- [ ] Can drag multiple selected ideas
- [ ] Double-click opens detail modal
- [ ] Can edit idea text in modal
- [ ] Can delete idea

#### Edge Management
- [ ] Can create edge by dragging from connection handle
- [ ] Edge creation shows preview line
- [ ] Can delete edge by crossing it during creation
- [ ] Edges render with correct styling
- [ ] Can select edges
- [ ] Can delete selected edges
- [ ] Relationship types display correctly

#### Themes & Styling
- [ ] All 8 themes work correctly
- [ ] Theme switcher in toolbar works
- [ ] Liquid glass effects render correctly
- [ ] Text colors adjust per theme
- [ ] Grid adapts to theme

#### Modals & UI
- [ ] Detail modal opens and closes correctly
- [ ] Can navigate between related ideas in modal
- [ ] Attachments display (if implemented)
- [ ] Sidebar resizes correctly
- [ ] Sidebar collapses to icon-only mode
- [ ] Toolbar is accessible and functional
- [ ] Settings modal works
- [ ] Keyboard shortcuts modal works

#### Performance
- [ ] Canvas performs well with 50+ ideas
- [ ] Pan/zoom is smooth
- [ ] No lag when dragging ideas
- [ ] Debounced save doesn't cause issues
- [ ] No memory leaks

### 9.2 Cross-Browser Testing
**Goal**: Ensure compatibility across browsers

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 9.3 Responsive Design Testing
**Goal**: Verify mobile and tablet experience

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (iPad, 768x1024)
- [ ] Mobile (iPhone, 375x667)

**Key Responsive Features**:
- [ ] Sidebar adapts to small screens
- [ ] Toolbar switches to mobile menu
- [ ] InputBox remains accessible
- [ ] Touch gestures work (pan, zoom, select)
- [ ] Modals are full-screen on mobile

---

## 📦 Phase 10: Performance Optimization (Day 8)

### 10.1 Rendering Optimizations
**Goal**: Ensure smooth performance with many ideas

**Tasks**:
- [ ] Implement viewport culling:
  ```typescript
  const visibleIdeas = useMemo(() => {
    return Array.from(ideas.values()).filter(idea => {
      const screenX = idea.x * zoom + panX
      const screenY = idea.y * zoom + panY
      return (
        screenX > -500 && screenX < windowWidth + 500 &&
        screenY > -500 && screenY < windowHeight + 500
      )
    })
  }, [ideas, zoom, panX, windowWidth, windowHeight])
  ```
- [ ] Add React.memo to IdeaNode component
- [ ] Optimize edge rendering with useMemo
- [ ] Debounce pan/zoom updates

**Validation**:
- Test with 100+ ideas
- Monitor frame rate during pan/zoom
- Check for unnecessary re-renders

### 10.2 Bundle Optimization
**Goal**: Minimize bundle size

**Tasks**:
- [ ] Analyze bundle with Next.js bundle analyzer
- [ ] Ensure proper tree-shaking
- [ ] Dynamic imports for heavy components (if needed)
- [ ] Optimize Radix UI imports (import only used components)

**Validation**:
- Bundle size is reasonable (<500KB main bundle)
- Lighthouse performance score >90
- Time to interactive <3s

---

## 📦 Phase 11: Data Migration & Edge Functions (Day 8-9)

### 11.1 Verify Database Schema
**Goal**: Ensure database matches Dumpfigma expectations

**Tasks**:
- [ ] Compare current database schema with Dumpfigma migration
- [ ] Verify tables exist:
  - `users` (with auth_user_id link)
  - `brain_dumps` (with viewport, theme)
  - `ideas` (with content, x, y, summary, etc.)
  - `edges` (with source_id, target_id, relationship_type)
  - `edge_types` (relationship definitions)
  - `attachments` (if implementing file uploads)
  - `ai_operations` (for AI cost tracking)
- [ ] Check RLS policies are enabled
- [ ] Verify database functions exist (get_descendants, get_ancestors, would_create_cycle)

**Potential Discrepancies**:
```diff
# Column Name Differences to Watch For:
- ideas.text → ideas.content
- ideas.position_x → ideas.x
- ideas.position_y → ideas.y
- edges.parent_id → edges.source_id
- edges.child_id → edges.target_id
```

**Resolution**:
- If database columns don't match, update store types or API layer to map correctly
- Add transformation layer in `api.ts` if needed

**Validation**:
- All required tables exist
- RLS policies enforce user isolation
- Database functions work correctly

### 11.2 Edge Function Deployment (Decision Point)
**Goal**: Decide between Edge Functions vs Next.js API Routes

**Option A: Keep Supabase Edge Functions**
- ✅ Dumpfigma code works as-is
- ✅ Deno runtime with good performance
- ❌ Separate deployment process
- ❌ Not integrated with Next.js

**Option B: Migrate to Next.js API Routes**
- ✅ Integrated with Next.js deployment
- ✅ Single codebase
- ❌ Requires porting from Deno to Node.js
- ❌ May need to rewrite Hono routes

**Recommendation**: Start with **Option A** (Edge Functions) for faster migration, then consider Option B later if needed.

**Tasks for Option A**:
- [ ] Verify Edge Function `make-server-2e3c1d79` is deployed
- [ ] Test all endpoints:
  - `POST /signup`
  - `POST /login`
  - `POST /logout`
  - `GET /brain-dumps`
  - `POST /brain-dumps`
  - `DELETE /brain-dumps/:id`
- [ ] Ensure `--no-verify-jwt` flag is set if needed
- [ ] Update API_BASE_URL in `src/lib/api.ts`

**Validation**:
- Edge Functions are accessible
- Authentication flow works
- Brain dumps can be saved/loaded/deleted
- Map serialization works correctly

---

## 📦 Phase 12: Final Polish & Documentation (Day 9-10)

### 12.1 UI Polish
**Goal**: Ensure consistent, professional appearance

**Tasks**:
- [ ] Review all liquid glass effects
- [ ] Ensure consistent spacing and sizing
- [ ] Verify all hover states
- [ ] Check focus indicators for accessibility
- [ ] Review error messages and empty states
- [ ] Add loading states where appropriate
- [ ] Ensure smooth transitions and animations

### 12.2 Error Handling
**Goal**: Graceful error handling throughout the app

**Tasks**:
- [ ] Add error boundaries in key locations
- [ ] Implement toast notifications for errors (Sonner)
- [ ] Handle API failures gracefully
- [ ] Display user-friendly error messages
- [ ] Log errors for debugging

**Error Scenarios to Handle**:
- [ ] Network failure
- [ ] Authentication failure
- [ ] API timeout
- [ ] Invalid data
- [ ] Session expiration

### 12.3 Documentation
**Goal**: Document the migrated codebase

**Tasks**:
- [ ] Update `README.md` with new features
- [ ] Document environment variables
- [ ] Create `ARCHITECTURE.md` explaining structure
- [ ] Document state management approach
- [ ] Add JSDoc comments to key functions
- [ ] Create `DEVELOPMENT.md` with setup instructions

### 12.4 Accessibility Audit
**Goal**: Ensure the app is accessible

**Tasks**:
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Verify color contrast ratios
- [ ] Add focus indicators
- [ ] Ensure modals trap focus

**Validation**:
- Lighthouse accessibility score >90
- Can navigate entire app with keyboard
- Screen reader announces important information

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] No console errors or warnings
- [ ] Environment variables configured for production
- [ ] Supabase project is production-ready
- [ ] Edge Functions deployed (if using)
- [ ] Database migrations applied
- [ ] SSL certificates configured

### Deployment Steps
- [ ] Build Next.js app: `npm run build`
- [ ] Verify build succeeds
- [ ] Deploy to Vercel/Netlify/other platform
- [ ] Configure environment variables on platform
- [ ] Set up custom domain (if applicable)
- [ ] Test production deployment

### Post-Deployment
- [ ] Verify authentication works in production
- [ ] Test brain dump CRUD operations
- [ ] Verify canvas performance
- [ ] Check database connections
- [ ] Monitor error logs
- [ ] Set up analytics (if desired)

---

## 🔧 Known Issues & Workarounds

### Issue 1: Map Serialization
**Problem**: JavaScript Maps don't serialize to JSON automatically
**Solution**: Transform Maps to arrays before API calls:
```typescript
// Serialize
const payload = {
  ...brainDump,
  ideas: Array.from(brainDump.ideas.entries())
}

// Deserialize
const brainDump = {
  ...data,
  ideas: new Map(data.ideas || [])
}
```

### Issue 2: Next.js Hydration with Client State
**Problem**: Hydration mismatches when rendering state-dependent UI
**Solution**: Use `useEffect` for client-only rendering or `suppressHydrationWarning`

### Issue 3: Supabase Client Multiple Instances
**Problem**: Creating multiple Supabase clients causes issues
**Solution**: Use singleton pattern in `src/lib/supabase/client.ts`

### Issue 4: CSS Transform Performance
**Problem**: Transform-based rendering can be slow with many elements
**Solution**: Implement viewport culling to only render visible ideas

---

## 📊 Progress Tracking

### Phase Completion
| Phase | Tasks | Status | Estimated Days |
|-------|-------|--------|----------------|
| Phase 1: Foundation | 3 | ⏸️ Not Started | 1 day |
| Phase 2: Styling | 2 | ⏸️ Not Started | 1 day |
| Phase 3: State Management | 2 | ⏸️ Not Started | 1-2 days |
| Phase 4: Utilities & API | 2 | ⏸️ Not Started | 1 day |
| Phase 5: Authentication | 3 | ⏸️ Not Started | 1 day |
| Phase 6: Canvas System | 4 | ⏸️ Not Started | 1-2 days |
| Phase 7: Components | 3 | ⏸️ Not Started | 1-2 days |
| Phase 8: Routes & Navigation | 2 | ⏸️ Not Started | 1 day |
| Phase 9: Testing | 3 | ⏸️ Not Started | 1 day |
| Phase 10: Optimization | 2 | ⏸️ Not Started | 1 day |
| Phase 11: Data & Backend | 2 | ⏸️ Not Started | 1-2 days |
| Phase 12: Polish | 4 | ⏸️ Not Started | 1-2 days |

**Total Estimated Time**: 8-10 days of focused development

---

## 🎯 Success Criteria

The migration is complete when:

✅ **Functional Requirements**:
- [ ] User can sign up, log in, and log out
- [ ] User can create, rename, and delete brain dumps
- [ ] User can create, edit, and delete ideas
- [ ] User can create and delete edges between ideas
- [ ] Canvas supports pan, zoom, and selection
- [ ] All 8 themes work correctly
- [ ] Data persists to database
- [ ] Multi-device support (responsive)

✅ **Non-Functional Requirements**:
- [ ] Performance: 60fps during pan/zoom
- [ ] Load time: <3s initial page load
- [ ] Accessibility: Lighthouse score >90
- [ ] Browser support: Chrome, Firefox, Safari, Edge (latest)
- [ ] Mobile support: iOS Safari, Chrome Mobile

✅ **Code Quality**:
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Code is documented
- [ ] Follows Next.js best practices

---

## 📝 Notes & Considerations

### Architecture Decisions
1. **Unified Store**: Chose single Zustand store over sliced store for consistency with Dumpfigma
2. **DOM Canvas**: Kept DOM/SVG-based rendering over Konva for feature parity
3. **Edge Functions**: Kept Supabase Edge Functions initially for faster migration
4. **Map Storage**: Maintained Map-based idea storage for performance and API compatibility

### Future Enhancements (Post-MVP)
- [ ] Real-time collaboration (Supabase Realtime)
- [ ] File attachment uploads (Supabase Storage)
- [ ] AI-powered summaries for ideas
- [ ] Advanced keyboard shortcuts (Cmd+Z undo)
- [ ] Export to various formats
- [ ] Sharing and permissions
- [ ] Mobile native apps (React Native)

### Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Last Updated**: November 1, 2025
**Status**: Ready for Implementation
**Next Steps**: Begin Phase 1 - Foundation & Setup

