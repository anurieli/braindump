# Brain Dump Canvas - Build Roadmap

**Version**: 1.1  
**Last Updated**: November 6, 2025  
**Timeline**: 6 weeks to MVP

---

## Overview

This roadmap breaks down the MVP build into 6 phases over 6 weeks. Each phase builds on the previous one and delivers a working increment. The goal is to have a testable product at the end of each week.

---

## Phase 1: Foundation (Week 1)

**Goal**: Set up infrastructure and basic canvas rendering

### Deliverables

**Infrastructure**:
- Next.js 14 project initialized
- TypeScript configured
- Tailwind CSS set up
- Supabase project created
- Database schema deployed
- Environment variables configured

**Database**:
- All tables created (brain_dumps, ideas, edges, edge_types, attachments)
- Indexes created
- Helper functions deployed
- Seed data (default edge types)

**Basic UI**:
- Window layout (top bar, side panel, canvas, input)
- Side panel with brain dump list
- Top bar with brain dump info
- Control panel dropdown (theme, grid settings)
- Quick input box (non-functional)

**Canvas**:
- Infinite canvas with Konva.js
- Grid rendering (dots and lines)
- Pan with Ctrl+Drag
- Zoom with Cmd+Scroll
- Viewport state management

**API**:
- Brain dump CRUD endpoints
- Basic error handling
- Database connection

### Success Criteria

- [ ] User can see empty canvas with grid
- [ ] User can pan and zoom smoothly (60 FPS)
- [ ] Side panel shows list of brain dumps
- [ ] User can create new brain dump
- [ ] User can switch between brain dumps
- [ ] Theme toggle works (light/dark)
- [ ] Grid toggle works

### Technical Tasks

1. Initialize Next.js project with TypeScript
2. Install dependencies (Konva, Zustand, Tailwind, pg)
3. Set up Supabase project and get credentials
4. Create database schema (run SQL migrations)
5. Build window layout components
6. Implement canvas with Konva
7. Implement grid rendering
8. Implement pan/zoom controls
9. Build side panel component
10. Build top bar component
11. Build control panel dropdown
12. Create API routes for brain dumps
13. Implement Zustand store for state management
14. Connect UI to API

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Phase 2: Idea Management (Week 2)

**Goal**: Create, display, and move ideas on canvas

### Deliverables

**Idea Creation**:
- Quick input accepts text
- Enter submits idea
- Shift+Enter creates new line
- Idea appears on canvas immediately
- Idea positioned at viewport center with random offset

**Idea Display**:
- Compact view (default state)
- Summary or truncated text displayed
- Auto-sizing based on content
- Visual styling (border, background, rounded corners)

**Idea Interaction**:
- Click and drag to move idea
- Position updates in real-time
- Position saved to database (debounced)
- Hover shows peak view (full text)
- Action buttons appear on hover (edit, delete)

**API**:
- Create idea endpoint
- Update idea endpoint (position, text)
- Delete idea endpoint
- Get ideas for brain dump endpoint

**State Management**:
- Ideas stored in Zustand
- Optimistic UI updates
- Sync with database in background

### Success Criteria

- [ ] User can type in quick input and press Enter
- [ ] Idea appears on canvas within 100ms
- [ ] User can drag idea to new position
- [ ] Position saves to database
- [ ] Hover shows full text
- [ ] Delete button removes idea
- [ ] Multiple ideas can exist on canvas
- [ ] Canvas performs well with 50+ ideas

### Technical Tasks

1. Build QuickInput component
2. Implement text input with Enter/Shift+Enter
3. Build IdeaComponent (compact view)
4. Implement drag-and-drop for ideas
5. Implement hover state (peak view)
6. Add action buttons (edit, delete)
7. Create API routes for ideas
8. Implement viewport culling for performance
9. Add debouncing for position updates
10. Connect quick input to API
11. Update Zustand store with idea actions
12. Test with 100+ ideas on canvas

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Phase 3: AI Processing (Week 3)

**Goal**: Implement summarization, embeddings, and grammar cleaning

### Deliverables

**Summarization**:
- Detect when text > 50 characters
- Queue background job for summarization
- Call OpenAI GPT-4 API
- Update idea with summary
- Fallback to truncation if API fails

**Embedding Generation**:
- Queue background job for every idea
- Call OpenAI Embeddings API (text-embedding-3-small)
- Store 1536-dimension vector in database
- Handle failures gracefully (log, continue)

**Grammar Cleaning**:
- Apply basic grammar rules before summarization
- Capitalize first letter
- Add period if missing
- Fix spacing issues
- Don't change meaning

**Background Jobs**:
- Simple in-memory job queue
- Process jobs asynchronously
- Retry logic for API failures
- Error logging

**Idea States**:
- "generating" state while processing
- "ready" state when complete
- "error" state if processing fails
- Visual indicators for each state

**OpenAI Integration**:
- API key configuration
- Rate limiting
- Error handling
- Cost monitoring

### Success Criteria

- [ ] Long ideas (>50 chars) are automatically summarized
- [ ] Summary appears within 5 seconds
- [ ] Embeddings generated for all ideas
- [ ] Grammar cleaning works without changing meaning
- [ ] API failures don't block user
- [ ] Fallback to truncation works
- [ ] Idea states update correctly
- [ ] Background jobs process without blocking UI

### Technical Tasks

1. Set up OpenAI API client
2. Build job queue system
3. Implement summarization function
4. Implement embedding generation function
5. Implement grammar cleaning function
6. Create background worker
7. Add retry logic for API calls
8. Implement fallback mechanisms
9. Add idea state management
10. Update UI to show states (loading spinner, etc.)
11. Add error logging
12. Test with various text lengths
13. Monitor API costs

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Phase 4: Edge System (Week 4)

**Goal**: Create and display relationships between ideas

### Deliverables

**Edge Creation**:
- Drag idea onto another to create edge
- Overlap detection (>30% area)
- Visual feedback during drag (highlight, glow)
- Edge creation modal with type selection
- Custom edge type creation

**Edge Display**:
- SVG rendering of edges
- Thin parent endpoint (2px)
- Thick child endpoint (8px)
- Black/white color based on theme
- Edges update when ideas move

**Edge Interaction**:
- Hover shows edge label
- Hover shows delete button
- Double-click opens note modal
- Delete edge with button or Delete key

**Edge Types**:
- 6 default types seeded in database
- User can create custom types
- Types stored and reusable

**Parent Indicator**:
- Ideas with children get gold stroke
- Visual distinction for parent nodes

**Validation**:
- Prevent duplicate edges
- Prevent self-references
- Prevent circular relationships
- Max 1 parent per idea (show warning if replacing)

**API**:
- Create edge endpoint
- Update edge endpoint (type, note)
- Delete edge endpoint
- Get edge types endpoint
- Create custom edge type endpoint

### Success Criteria

- [ ] User can drag idea onto another
- [ ] Edge creation modal appears
- [ ] User can select edge type
- [ ] Edge appears on canvas with correct direction
- [ ] Edges move with ideas
- [ ] Hover shows label and delete button
- [ ] Double-click opens note modal
- [ ] Parent ideas show gold stroke
- [ ] Validation prevents invalid edges
- [ ] Custom edge types can be created

### Technical Tasks

1. Build EdgeRenderer component (SVG)
2. Implement overlap detection
3. Build edge creation modal
4. Implement edge type selection
5. Build custom edge type creation modal
6. Create API routes for edges
7. Implement edge validation logic
8. Add parent indicator styling
9. Implement edge hover state
10. Build edge note modal
11. Implement edge deletion
12. Update Zustand store with edge actions
13. Test with complex edge networks

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Phase 5: Idea Details & Attachments (Week 5)

**Goal**: Modal view for ideas with attachments

### Deliverables

**Idea Modal**:
- Double-click idea to open modal
- Display full original text (grammar-cleaned)
- Show all attachments with previews
- Show connected ideas (parents and children)
- Edit mode for text and attachments
- Close with X, Close button, Escape, or click outside

**Attachments**:
- Drag-and-drop files onto quick input
- Support images, PDFs, text files
- Upload to Supabase Storage
- Store references in database
- Display thumbnails in modal
- Delete attachments

**URL Handling**:
- Detect URLs in text or attachments
- Fetch metadata (title, description, favicon)
- Display rich preview
- Auto-categorize idea type (article, tool)

**Edit Mode**:
- Click Edit button in modal
- Text becomes editable textarea
- Add/remove attachments
- Save triggers re-summarization and re-embedding
- Cancel discards changes

**API**:
- Upload attachment endpoint
- Delete attachment endpoint
- Fetch URL metadata endpoint

### Success Criteria

- [ ] Double-click opens modal
- [ ] Modal shows full text and attachments
- [ ] User can drag files onto quick input
- [ ] Files upload to storage
- [ ] Thumbnails display in modal
- [ ] URL metadata fetched and displayed
- [ ] Edit mode works for text and attachments
- [ ] Saving triggers re-processing
- [ ] Connected ideas shown and clickable

### Technical Tasks

1. Build IdeaModal component
2. Implement double-click handler
3. Build attachment upload flow
4. Set up Supabase Storage
5. Create API route for file uploads
6. Implement drag-and-drop on quick input
7. Build attachment preview components
8. Implement URL metadata fetching
9. Build edit mode UI
10. Implement save/cancel logic
11. Add re-summarization on edit
12. Show connected ideas in modal
13. Make connected ideas clickable (open their modals)

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Phase 6: Polish & Testing (Week 6)

**Goal**: Undo/redo, keyboard shortcuts, performance optimization, bug fixes

### Deliverables

**Undo/Redo**: ✅ COMPLETE
- ✅ Implement action history stack (UndoRedoManager class)
- ✅ Ctrl+Z / Cmd+Z to undo
- ✅ Ctrl+Shift+Z / Cmd+Shift+Z to redo
- ✅ Support for all actions (move, create, delete, edit)
- ✅ Max 50 actions in stack
- ✅ Database synchronization for deleted item restoration
- ✅ Automatic history tracking via Zustand subscription
- ✅ Edge cascade delete handling
- ✅ UI buttons in control panel
- ✅ Clear on brain dump switch

**Keyboard Shortcuts**:
- All shortcuts implemented (see PRD section 7)
- Global event listener
- Prevent default browser behavior
- Shortcuts list in control panel

**Performance Optimization**:
- Viewport culling optimized
- Debouncing tuned
- Memoization added to expensive calculations
- Database query optimization
- Index verification

**Bug Fixes**:
- Fix all known bugs from previous phases
- Edge cases handled
- Error messages improved
- User feedback enhanced

**Testing**:
- Unit tests for critical functions
- Integration tests for API endpoints
- E2E tests for critical flows
- Performance tests with 500+ ideas
- Load testing

**Documentation**:
- README with setup instructions
- API documentation
- Deployment guide
- User guide (basic)

**Deployment**:
- Deploy to Vercel
- Set up environment variables
- Run migrations on production database
- Smoke tests on production
- Error monitoring (Sentry)

### Success Criteria

- [✅] Undo/redo works for all actions (including database restoration)
- [ ] All keyboard shortcuts work
- [ ] Canvas performs at 60 FPS with 500 ideas
- [ ] No critical bugs
- [ ] All tests passing
- [ ] Deployed to production
- [ ] Error monitoring active
- [ ] Documentation complete

### Technical Tasks

1. ✅ Implement undo/redo system with database sync
2. ✅ Build action history stack (UndoRedoManager)
3. ✅ Add undo/redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
4. ✅ Create ControlPanel component with undo/redo buttons
5. ✅ Handle CASCADE delete edge restoration
6. Add remaining keyboard shortcuts
4. Optimize viewport culling
5. Add memoization to components
6. Optimize database queries
7. Write unit tests
8. Write integration tests
9. Write E2E tests
10. Performance testing
11. Bug fixing
12. Write documentation
13. Deploy to Vercel
14. Set up Sentry
15. Run production smoke tests

**Estimated Effort**: 40 hours (1 week, 1 developer)

---

## Timeline Summary

| Week | Phase | Focus | Deliverable |
|------|-------|-------|-------------|
| 1 | Foundation | Infrastructure, canvas, brain dumps | Pan/zoom canvas with brain dump switching |
| 2 | Idea Management | Create, display, move ideas | Working idea creation and movement |
| 3 | AI Processing | Summarization, embeddings | Auto-summarization of long ideas |
| 4 | Edge System | Relationships between ideas | Drag-to-connect edges with labels |
| 5 | Details & Attachments | Modal, files, URLs | Full idea details with attachments |
| 6 | Polish & Testing | Undo/redo, shortcuts, optimization | Production-ready MVP |

---

## Resource Allocation

**Team Size**: 1-2 developers

**Effort**: 240 hours total (40 hours/week × 6 weeks)

**Skills Required**:
- Frontend: React, TypeScript, Konva.js
- Backend: Next.js API routes, PostgreSQL
- AI: OpenAI API integration
- DevOps: Vercel deployment, Supabase setup

---

## Risk Mitigation

### Technical Risks

**Risk**: Canvas performance with 1000+ ideas  
**Mitigation**: Viewport culling, virtualization, early performance testing

**Risk**: AI API latency affecting UX  
**Mitigation**: Asynchronous processing, optimistic UI, fallbacks

**Risk**: Database costs with embeddings  
**Mitigation**: pgvector is cheap, monitor usage, optimize queries

**Risk**: Complex edge rendering slowing down canvas  
**Mitigation**: SVG optimization, debouncing, memoization

### Schedule Risks

**Risk**: Phase takes longer than 1 week  
**Mitigation**: Prioritize core features, defer nice-to-haves, add buffer week

**Risk**: Blocked on external dependencies (Supabase, OpenAI)  
**Mitigation**: Set up accounts early, have fallback plans, test integrations early

**Risk**: Scope creep during development  
**Mitigation**: Strict adherence to PRD, defer new features to post-MVP

---

## Definition of Done (Per Phase)

A phase is complete when:
1. All deliverables implemented
2. All success criteria met
3. Code reviewed (if team > 1)
4. Tests written and passing
5. No known critical bugs
6. Documentation updated
7. Demo-able to stakeholders

---

## Post-MVP Roadmap (Future Phases)

### Phase 7: Canvas Assistant (AI Chat)
- Chat interface for asking questions about canvas
- Semantic search using embeddings
- Smart suggestions and insights
- Gap detection and pattern recognition

### Phase 8: Auto-Grouping & Clustering
- Detect clusters based on embeddings and proximity
- Visual grouping with containers
- Suggested organization layouts
- Hierarchical structures

### Phase 9: Collaboration
- Real-time multi-user editing
- Shared brain dumps
- Comments and discussions
- Presence indicators

### Phase 10: Mobile & Export
- Mobile-optimized UI
- Touch gestures for pan/zoom
- Export to PDF, Markdown, JSON
- Integration with task managers

---

## Success Metrics (Post-Launch)

**Week 1**:
- 10+ users testing MVP
- Collect qualitative feedback
- Identify critical bugs

**Month 1**:
- 50+ active users
- 200+ brain dumps created
- 1000+ ideas created
- <5% error rate on AI operations

**Month 3**:
- 100+ active users
- 30%+ weekly retention
- Clear signal on most-used features
- Validated next feature priorities

---

## Next Steps After Roadmap Completion

1. **User Testing**: Recruit 10-20 beta testers
2. **Feedback Collection**: Surveys + user interviews
3. **Iteration**: Fix bugs, improve UX based on feedback
4. **Feature Prioritization**: Decide what to build next (Phases 7-10)
5. **Growth**: Marketing, onboarding, analytics
6. **Monetization**: Explore revenue models (if applicable)

