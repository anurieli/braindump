# Brain Dump Canvas - Project Overview

**Version**: 1.1  
**Last Updated**: November 6, 2025

---

## Vision

Brain Dump Canvas is a minimalist web application designed to capture and organize thoughts in a visual, spatial environment. Unlike traditional note-taking apps that force linear organization, this tool mirrors how the human brain actually works - through spatial relationships, associations, and emergent structure.

The core insight is that ideas don't exist in isolation. They connect, cluster, and form hierarchies naturally. The goal is to provide a frictionless interface that makes these relationships visible and manipulable.

---

## Core Concept

Rapidly dump ideas into an infinite 2D canvas via a persistent input box. Each idea becomes a visual node that can be moved, connected to other ideas, and expanded for detail. The system handles heavy lifting (summarization, embedding generation, relationship detection) asynchronously in the background, never blocking the flow.

---

## Key Features

**1. Zero-Friction Input**
- Persistent input box at bottom of screen
- Start typing anywhere on canvas to auto-focus input
- Enter to submit, idea appears instantly
- No menus, no dialogs, no interruptions
- Can submit 10 ideas in 30 seconds

**2. Spatial Organization**
- Ideas positioned with XY coordinates on infinite canvas
- Proximity indicates relationships
- Visual clustering emerges naturally
- Pan and zoom for different perspectives

**3. Explicit Relationships**
- Drag one idea onto another to create parent-child edge
- Edges are labeled (depends_on, blocks, inspired_by, etc.)
- Visual graph structure shows dependencies and hierarchies

**4. Asynchronous Intelligence**
- Long ideas auto-summarized (GPT-4)
- All ideas embedded for semantic search (OpenAI embeddings)
- Everything happens in background, never blocks UI

**5. Context-Aware Assistant** (Future)
- Understands entire canvas through embeddings
- Can answer questions about ideas
- Suggests organization and grouping
- Detects gaps and patterns

---

## Use Cases

**Personal Brainstorming**
- Dump all thoughts from a meeting or reading session
- Visually organize and connect ideas
- See patterns and themes emerge

**Project Planning**
- Break down complex projects into ideas
- Create dependency graphs with edges
- Identify blockers and prerequisites

**Research & Learning**
- Capture notes from multiple sources
- Link related concepts
- Build knowledge graphs

**Creative Exploration**
- Explore idea spaces without linear constraints
- Make unexpected connections
- Iterate on concepts visually

---

## MVP Scope

**What's Included**:
- Create and switch between brain dumps (isolated workspaces)
- Rapidly add ideas to canvas via quick input
- Move ideas around spatially
- Connect ideas with labeled parent-child relationships
- View idea details in modal
- Automatic summarization of long ideas
- Attach files and URLs to ideas
- Undo/redo (50 actions with database persistence) ✅
- Pan/zoom canvas navigation
- Theme toggle (light/dark)
- Grid toggle (dots/lines)

**What's NOT Included** (Post-MVP):
- Real-time collaboration (single-user only)
- Mobile optimization (desktop web only)
- User authentication
- Export functionality
- Rich text formatting
- Search and filtering
- Voice input

---

## Technical Philosophy

**Optimistic UI**
- Show changes immediately, sync in background
- Never wait for server
- Handle failures gracefully with rollback

**Modular Architecture**
- Each component (canvas, idea, edge, input) is independent
- Can swap implementations without affecting others
- Easy to extend with new features

**Performance First**
- Viewport culling for large canvases
- Debounced database writes
- Lazy loading of brain dumps
- Efficient vector operations

**AI as Enhancement**
- AI improves experience but isn't required
- Failures degrade gracefully (show original text if summarization fails)
- Full control over AI processes

---

## Development Timeline

**Week 1-2**: Core Infrastructure
- Database schema
- Next.js setup
- Canvas with basic rendering
- Quick-input interface

**Week 3-4**: Idea Management
- Create, move, delete ideas
- Summarization pipeline
- Embedding generation
- Brain dump switching

**Week 5**: Edge System
- Edge creation and rendering
- Parent-child relationships
- Edge labels and notes

**Week 6**: Polish & Testing
- Performance optimization
- Bug fixes
- Testing
- Documentation

**Total: 6 weeks to MVP**

---

## Infrastructure Costs

**Monthly** (estimated):
- Vercel: $0 (free tier)
- Supabase: $0-25 (free tier)
- OpenAI API: ~$10-50 (depends on usage)
- **Total: ~$10-75/month**

**Cost Notes**:
- Embedding generation is one-time per idea (~$0.003 per 1000 ideas)
- Summarization only for long ideas (~30% of ideas)
- Costs scale linearly with usage

---

## Future Directions

**Collaboration**
- Real-time multi-user editing
- Shared brain dumps
- Comments and discussions

**Intelligence**
- Auto-grouping and clustering
- Canvas assistant (chat interface)
- Smart suggestions and gap detection

**Integration**
- Export to task managers (Notion, Linear, etc.)
- Import from other tools
- API for third-party extensions

**Platform**
- Mobile apps (iOS, Android)
- Desktop apps (Electron)
- Browser extensions for quick capture

---

## Technical Requirements

**Performance Targets**:
- Idea creation: <100ms (UI response)
- Canvas pan/zoom: 60 FPS
- Brain dump switch: <1s
- Summarization: <5s
- Database queries: <200ms

**Scalability Targets**:
- 500 ideas per brain dump (smooth performance)
- 100 brain dumps total
- 1000+ ideas (acceptable with viewport culling)

**Browser Support**:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Desktop only for MVP

