# Train-of-Thought Mode

## Overview

Train-of-Thought Mode enables users to automatically create edge connections between a selected parent idea and any new ideas they create. This feature streamlines the process of building idea hierarchies by chaining ideas together in a natural thought flow.

## Components Affected

- **InputBox.tsx**: Toggle button, auto-relate logic, edge creation
- **IdeaNode.tsx**: Standard selection handling
- **Canvas.tsx**: ESC key handling for clearing selection

## How to Use

### Basic Workflow

1. **Enable Mode**: Click the train-of-thought toggle in the input area
2. **Select Parent**: Click any single idea on the canvas (it becomes the pending parent)
3. **Create Chain**: Type and submit new ideas - they automatically connect to the pending parent
4. **Auto-Chaining**: Each new idea becomes the parent for the next one
5. **Clear Selection**: Press ESC to deselect (mode stays active)
6. **Navigate Up**: Press ← with empty input to move to parent in hierarchy

### Behaviors

- **Single Selection**: Only one selected node acts as pending parent
- **Multiple Selection**: No pending parent (ideas are standalone)
- **No Selection**: Ideas are standalone but become pending parent for next
- **Positioning**: New ideas appear 150px below their parent
- **Connections**: Auto-created edges use 'related_to' type

### Shortcuts

- **ESC**: Clear selection (pending parent) without disabling mode
- **← (Left Arrow)**: Navigate up hierarchy when input empty
- **Toggle Button**: Enable/disable train-of-thought mode

---

*Documentation Version: 1.0*  
*Last Updated: November 10, 2025*  
*Feature Status: Complete*

