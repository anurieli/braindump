<!-- Extended plan for conditional edge creation with new idea creation -->
# Conditional Edge Creation + New Idea Creation Plan

## Overview
Extend the connection handle drag behavior to conditionally create edges OR create new ideas based on Command key state.

## Current Behavior
- Drag from connection handle (blue circle in center of hovered idea)
- Automatically creates/deletes edges when hovering over other ideas
- Line shows in blue (default), green (new edge), or red (delete edge)

## New Behavior

### Connection Handle Drag WITH Command Key
- **Edge creation/deletion**: Works on hover over existing ideas (current behavior)
- **ShortcutAssistant message**: "Hold Command to connect to existing ideas"
- **Visual**: Connection line with colors (blue/green/red)

### Connection Handle Drag WITHOUT Command Key
- **No edge creation/deletion**: Hovering over ideas does nothing
- **New idea preview**: Show outline/ghost of new idea at cursor position
- **ShortcutAssistant message**: "Let go to create new idea at edge"
- **On mouse release in empty space**:
  1. Create new idea at cursor position (canvas coordinates)
  2. Create edge from source idea → new idea
  3. Open QuickIdeaInput at new idea position
  4. User can immediately type

### Escape Key Behavior
- **During connection drag**: Cancel connection (clear state)
- **During QuickIdeaInput**: Close input without creating idea
- Both scenarios should hide ShortcutAssistant

## Implementation Tasks

### 1. Update ConnectionLine.tsx
**Purpose**: Add visual preview of new idea when not holding Command

**Changes**:
- Import `isCommandKeyPressed` from store
- Add conditional rendering logic:
  - IF `isCommandKeyPressed === true`: Show current connection line (no changes)
  - IF `isCommandKeyPressed === false`: 
    - Show connection line (blue color only, no green/red)
    - Add idea preview outline at cursor position
    - Preview should be:
      - Dashed border rectangle (~200px × 100px)
      - Semi-transparent background
      - Follow cursor position
      - Positioned at canvas coordinates (use screenToCanvas)

**New preview element**:
```jsx
// Pseudo-code for preview
<div 
  className="absolute border-2 border-dashed border-blue-400 bg-blue-100/20 rounded-lg"
  style={{
    width: '200px',
    height: '100px',
    left: cursorCanvasX - 100,
    top: cursorCanvasY - 50,
    transform: viewport transforms,
  }}
/>
```

### 2. Update IdeaNode.tsx
**Purpose**: Only process edge hover logic when Command is pressed

**Changes in hover effect (useEffect for edge creation/deletion, lines 169-198)**:
- Add condition: `if (!isCommandKeyPressed) return;` at start of effect
- This prevents edge creation/deletion when hovering without Command key
- Keep the existing logic but wrap it in Command key check

**Changes in handleConnectionHandleMouseDown**:
- When connection starts, show ShortcutAssistant with message:
  - "Hold Command to connect to existing ideas • Let go to create new idea at edge"

### 3. Update Canvas.tsx  
**Purpose**: Handle connection completion in empty space (create new idea + edge)

**Add new handler: `handleConnectionMouseUp`**:
- Listen for global mouseup during `isCreatingConnection`
- Check if `isCommandKeyPressed === false`
- Check if NOT hovering over any idea (use `hoveredNodeId === null`)
- If conditions met:
  1. Get cursor position in canvas coordinates
  2. Call `addIdea()` with empty text at cursor position
  3. Get the newly created idea ID
  4. Call `addEdge(connectionSourceId, newIdeaId, 'related_to')`
  5. Call `showQuickEditor()` at the new idea position
  6. Call `cancelConnection()` to clear connection state
  7. ShortcutAssistant will be handled by QuickIdeaInput escape logic

**Update existing global mouseup handler** (lines 452-461):
- Currently just calls `cancelConnection()`
- Modify to first check for new idea creation scenario
- Only cancel connection if not creating new idea

### 4. Update ShortcutAssistant Messages
**Purpose**: Show context-aware messages during connection drag

**In IdeaNode.tsx - `handleConnectionHandleMouseDown`**:
- Show message: "Hold Command to connect to existing ideas • Let go to create new idea at edge"
- This is a two-part message covering both scenarios

**Dynamic message updates** (optional enhancement):
- Could update message based on Command key state during drag
- If Command pressed: emphasize "connecting to existing ideas"
- If Command released: emphasize "create new idea at edge"

### 5. Enhanced Escape Key Handling
**Purpose**: Cancel operations at any stage

**In Canvas.tsx keyboard handler** (lines 508-515):
- Already has Escape logic for connection cancellation
- Verify it properly clears all connection state
- Verify it hides ShortcutAssistant

**In QuickIdeaInput.tsx** (lines 172-174):
- Already has Escape handling
- Verify it hides the editor
- Add call to `hideShortcutAssistant()` if not already handled by connection cancel

### 6. State Management (uiSlice.ts)
**No new state needed** - existing state is sufficient:
- `isCreatingConnection` - tracks connection mode
- `connectionSourceId` - source idea for connection
- `hoveredNodeId` - which idea is being hovered
- `isCommandKeyPressed` - whether Command key is held
- `shortcutAssistant` - for showing messages

## Testing Scenarios

1. **Connection handle drag WITH Command**:
   - Hover over ideas → creates/deletes edges ✅
   - ShortcutAssistant shows appropriate message ✅
   - Line colors change (green/red) ✅

2. **Connection handle drag WITHOUT Command**:
   - Hover over ideas → no edge creation ✅
   - Preview outline follows cursor ✅
   - ShortcutAssistant shows "Let go to create..." ✅

3. **Release without Command in empty space**:
   - Creates new idea at cursor ✅
   - Creates edge from source → new idea ✅
   - Opens QuickIdeaInput ✅
   - Can type immediately ✅

4. **Toggle Command mid-drag**:
   - Press Command → enables edge creation ✅
   - Release Command → shows preview mode ✅

5. **Escape key**:
   - During connection → cancels, hides assistant ✅
   - During quick input → closes input, hides assistant ✅

6. **Release without Command over existing idea**:
   - Should NOT create edge ✅
   - Should cancel connection ✅

## Files to Modify

1. `/workspace/src/components/ConnectionLine.tsx` - Add preview rendering
2. `/workspace/src/components/IdeaNode.tsx` - Conditional hover logic + assistant message
3. `/workspace/src/components/Canvas.tsx` - Handle connection completion → new idea creation
4. No changes to `uiSlice.ts` - existing state is sufficient
5. No changes to `QuickIdeaInput.tsx` - works as-is

## Implementation Order

1. ✅ Update IdeaNode.tsx hover logic (block edge creation without Command)
2. ✅ Update IdeaNode.tsx connection start (show ShortcutAssistant message)
3. ✅ Update ConnectionLine.tsx (add preview outline rendering)
4. ✅ Update Canvas.tsx (handle mouse up → create idea + edge)
5. ✅ Test Escape key handling (should already work)

