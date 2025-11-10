# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Tools and MCP
- make sure to ALWAYS check MCP for database (supabase operations), context (context 7), vercel, etc...

## Code Style
- TypeScript everywhere (no exceptions)
- Functional components with hooks only  
- 2-space indentation
- camelCase for variables, PascalCase for components
- emojis ONLY inside of debug logs

## Architecture Notes
- State management with Zustand
- New components need tests alongside them
- delete tests after they pass
- Performance matters—always consider bundle size

## Don't Do This
- Don't use class components (legacy codebase reasons)
- Don't bypass our error boundary setup
- Don't write 500-line components (break them up!)
- dont leave dev servers running after useing them... close the ones you open
- DO NOT RUN DEV SERVERS

## Project Documentation References
Always consult these docs for implementation details and requirements:

- **Product Requirements**: `@./docs/Brain Dump Canvas - MVP Product Requirements Document.md`
- **Technical Architecture**: `@./docs/Brain Dump Canvas - Technical Architecture.md`  
- **Build Roadmap**: `@./docs/Brain Dump Canvas - Build Roadmap.md`
- **Project Overview**: `@./docs/Brain Dump Canvas - Project Overview.md`
- **Database Schema**: `@./docs/database_schema.sql`


## Implementation Guidelines

**When implementing features, always reference:**
1. **PRD** for user flows and acceptance criteria
2. **Technical Architecture** for implementation patterns
3. **Database Schema** for data structure requirements
4. **Build Roadmap** for phased delivery approach
** IMPORTANT if something is changed please make sure to update the relavant documents !!!!

**AI Module Notes:**
- Centralize every new AI node under `src/lib/ai/`
- Define model metadata in `models.ts`, prompts in `prompts.ts`, and reuse `summarizeText` / `createEmbedding` patterns when adding helpers
- Always log AI usage via the shared helpers so `ai_operations` remains accurate

**Key Performance Targets from PRD:**
- Idea creation: <100ms UI response
- Canvas pan/zoom: 60 FPS
- Brain dump switch: <1s
- Summarization: <5s
- Database queries: <200ms

**Architecture Patterns to Follow:**
- Optimistic UI (show changes immediately, sync background)
- Viewport culling for performance (500px buffer)
- Debounced database writes (300ms for positions)
- Async AI processing (never block UI)
- Error boundaries and graceful degradation

