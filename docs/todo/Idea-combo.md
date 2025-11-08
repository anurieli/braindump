# Idea Combination Feature - Product Requirements Document

**Version**: 1.0  
**Created**: November 8, 2024  
**Target Implementation**: 1 week  

---

## 1. Overview

### 1.1 Purpose
Add the ability for users to combine/merge ideas by dragging one idea onto another while holding the Shift key. This creates a new unified idea from two separate ideas, complementing the existing relationship-creation system.

### 1.2 Goals
- **Primary**: Enable users to merge related ideas into a single, more comprehensive idea
- **Secondary**: Maintain existing drag-and-drop relationship creation functionality  
- **Tertiary**: Provide intuitive UX that doesn't conflict with current interactions

### 1.3 Success Metrics
- Users can successfully combine ideas using Shift+drag within 1 attempt
- No regression in existing edge creation functionality
- Combined ideas trigger AI processing correctly
- Undo/redo works seamlessly for combination operations

---

## 2. User Stories & Acceptance Criteria

### 2.1 Primary User Story
**As a user**, I want to drag one idea onto another while holding Shift to combine them into a single idea, so that I can merge related concepts instead of just linking them.

**Acceptance Criteria:**
- [ ] Shift+drag interaction opens combination modal
- [ ] Modal shows preview of combined text
- [ ] User can choose combination method (merge into source/target/create new)
- [ ] Combined idea appears at target position
- [ ] Source idea is deleted after combination
- [ ] AI processing triggers for combined text
- [ ] Operation is undoable

### 2.2 Visual Feedback Story
**As a user**, I want clear visual feedback when in combination mode, so I know the difference between creating relationships and combining ideas.

**Acceptance Criteria:**
- [ ] Orange border appears on ideas during Shift+drag (vs blue for normal drag)
- [ ] Cursor changes to indicate combination mode
- [ ] Hover states clearly differentiate combination vs relationship mode

### 2.3 Modal Interaction Story
**As a user**, I want to preview and control how ideas are combined, so I can ensure the result meets my needs.

**Acceptance Criteria:**
- [ ] Modal shows both original ideas clearly
- [ ] Preview updates in real-time as options change
- [ ] "Merge into A", "Merge into B", and "Create New" options available
- [ ] Custom text editing option for "Create New" mode
- [ ] Cancel option exits without changes

---

## 3. Technical Architecture

### 3.1 Affected Components

#### Frontend Components:
- **IdeaNode.tsx** (Primary)
  - Add combination mode detection
  - Extend drag interaction logic
  - Modify visual states and borders
  
- **IdeaCombinationModal.tsx** (New)
  - Modal for combination options
  - Preview generation and display
  - Method selection UI

- **Canvas.tsx** 
  - Handle global Shift key state
  - Coordinate between idea nodes

#### Store Slices:
- **ideasSlice.ts** (Major changes)
  - Add `combineIdeas()` action
  - Add `previewCombination()` method
  - Integrate with AI processing pipeline

- **modalSlice.ts** 
  - Add `idea-combination` modal type
  - Add combination-specific state

- **undoRedoSlice.ts**
  - Add `COMBINATION` action type
  - Implement combination-specific undo/redo

#### Backend Integration:
- **Database Schema Updates**
  - Add `source_idea_ids` JSONB field to ideas table
  - Add `combination_method` field for tracking

### 3.2 Data Flow

```
User initiates Shift+drag
↓
IdeaNode detects combination mode
↓
Visual feedback updates (orange borders)
↓
Drop detected on target idea
↓
IdeaCombinationModal opens
↓
User selects combination method
↓
Store.combineIdeas() called
↓
Database: Update primary idea, delete secondary
↓
AI processing triggered for combined text
↓
Undo action saved to history
```

### 3.3 Integration Points

#### With Existing Edge System:
- Normal drag (no Shift): Create/delete edges (unchanged)
- Shift+drag: Open combination modal (new)
- Visual differentiation via border colors

#### With AI Processing:
- Combined ideas trigger `processIdeaAI()`
- Summary generation for new combined text
- Embedding generation for similarity search

#### With Undo/Redo:
- Store complete state of both original ideas
- Store all connected edges before deletion
- Restore both ideas and edges on undo

---

## 4. User Interface Specifications

### 4.1 Visual States

#### Combination Mode Indicators:
- **Source Idea**: Orange border (3px solid #f59e0b)
- **Target Idea**: Orange border with slight glow
- **Cursor**: Changes to indicate combination mode
- **Background**: Subtle orange tint during hover

#### Modal Design:
```
┌─────────────────────────────────────────────────┐
│  Combine Ideas                             ✕    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Source: "Build todo app"                       │
│  Target: "Use React and TypeScript"             │
│                                                 │
│  How would you like to combine them?            │
│                                                 │
│  ○ Merge into source idea                       │
│    Result: "Build todo app                      │
│            • Use React and TypeScript"          │
│                                                 │  
│  ○ Merge into target idea                       │
│    Result: "Use React and TypeScript            │
│            • Build todo app"                    │
│                                                 │
│  ○ Create new combined idea                     │
│    Result: [Editable text area]                 │
│                                                 │
│  [ Cancel ]           [ Combine Ideas ]         │
└─────────────────────────────────────────────────┘
```

### 4.2 Keyboard Shortcuts
- **Shift+Drag**: Combination mode
- **Escape**: Cancel combination modal
- **Enter**: Confirm combination (in modal)

---

## 5. Implementation Phases

### Phase 1: Core Interaction (Days 1-2)
- [ ] Add combination mode state tracking
- [ ] Modify IdeaNode drag detection
- [ ] Implement visual feedback
- [ ] Basic combination action in store

### Phase 2: Modal System (Days 3-4)
- [ ] Create IdeaCombinationModal component
- [ ] Implement preview generation
- [ ] Add combination method selection
- [ ] Integrate with existing modal system

### Phase 3: AI Integration (Day 5)
- [ ] Ensure combined ideas trigger AI processing
- [ ] Update text summarization pipeline
- [ ] Test embedding generation for combined text

### Phase 4: Undo/Redo (Days 6-7)
- [ ] Implement combination-specific undo actions
- [ ] Test edge restoration on undo
- [ ] Comprehensive undo/redo testing

---

## 6. Technical Requirements

### 6.1 Performance
- Combination modal opens within 100ms
- Visual feedback appears within 16ms (60fps)
- Database operations complete within 500ms
- No impact on existing drag performance

### 6.2 Browser Compatibility
- All existing supported browsers (Chrome, Firefox, Safari)
- Shift key detection works consistently
- Modal renders correctly across browsers

### 6.3 Data Integrity
- Original ideas preserved in undo history
- Connected edges properly restored on undo
- No orphaned edges after combination
- Database constraints maintained

---

## 7. Testing Strategy

### 7.1 Unit Tests
- [ ] Combination mode detection logic
- [ ] Preview text generation
- [ ] Undo/redo action creators
- [ ] Modal state management

### 7.2 Integration Tests
- [ ] End-to-end combination workflow
- [ ] AI processing after combination
- [ ] Database consistency after operations
- [ ] Undo/redo with edge restoration

### 7.3 User Testing Scenarios
- [ ] Combine two text ideas
- [ ] Combine idea with attachment idea
- [ ] Cancel combination mid-process
- [ ] Undo/redo combination
- [ ] Switch between relationship and combination modes

---

## 8. Risk Assessment

### 8.1 High Risk
- **Modifier Key Detection**: Shift key may not work consistently across all browsers
- **Edge Restoration**: Complex edge relationships may not restore correctly

### 8.2 Medium Risk
- **Modal UX Complexity**: Too many options might confuse users
- **Performance Impact**: Additional state tracking could slow down canvas

### 8.3 Mitigation Strategies
- Extensive cross-browser testing for Shift detection
- Comprehensive test coverage for edge restoration
- Simple, clear modal design with progressive disclosure
- Performance profiling during development

---

## 9. Dependencies

### 9.1 Internal Dependencies
- Existing drag-and-drop system
- Modal infrastructure
- AI processing pipeline
- Undo/redo system

### 9.2 External Dependencies
- Supabase (database operations)
- OpenAI API (for processing combined text)
- Browser Shift key detection

---

## 10. Future Enhancements

### 10.1 Advanced Combination Methods
- Custom separators (comma, semicolon, etc.)
- Smart text merging based on content type
- Batch combination (select multiple ideas)

### 10.2 AI-Powered Suggestions
- Auto-suggest combination method based on content
- Smart text ordering within combinations
- Duplicate detection before combination

### 10.3 Visual Enhancements
- Animation during combination process
- Preview overlay during drag
- Better visual hierarchy in combined text

---

## 11. Acceptance Testing

### 11.1 Core Functionality
- [ ] User can combine two ideas using Shift+drag
- [ ] Combined idea contains content from both sources
- [ ] AI processing works correctly on combined text
- [ ] Undo restores both original ideas

### 11.2 Edge Cases
- [ ] Combining ideas with existing relationships
- [ ] Combining attachment ideas with text ideas
- [ ] Canceling combination preserves original state
- [ ] Rapid combination operations don't cause conflicts

### 11.3 Regression Testing
- [ ] Normal drag-and-drop edge creation still works
- [ ] Existing undo/redo functionality unaffected
- [ ] Canvas performance remains stable
- [ ] AI processing pipeline unchanged for non-combined ideas