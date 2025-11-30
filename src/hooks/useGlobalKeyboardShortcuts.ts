'use client'

import { useHotkeys } from 'react-hotkeys-hook'
import { useStore, useStoreActions } from '@/store'
import { useGlobalUndoRedo } from '@/hooks/useUndoRedo'
import { debugKeyboard } from '@/lib/undo-debug'

export function useGlobalKeyboardShortcuts() {
  const createBrainDump = useStore(state => state.createBrainDump)
  const duplicateBrainDump = useStore(state => state.duplicateBrainDump)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const clearSelection = useStore(state => state.clearSelection)
  const cancelConnection = useStore(state => state.cancelConnection)
  const isCreatingConnection = useStore(state => state.isCreatingConnection)
  const selectIdea = useStore(state => state.selectIdea)
  const selectedIdeaIds = useStore(state => state.selectedIdeaIds)

  // Store actions
  const { duplicateSelectedNodes } = useStoreActions()

  // Use centralized undo/redo handler
  const { canUndo, canRedo, undo, redo } = useGlobalUndoRedo()

  // Ctrl+N: Create new brain dump
  useHotkeys('ctrl+n', (event) => {
    event.preventDefault()
    createBrainDump('New Brain Dump')
  }, {
    enableOnFormTags: false, // Don't trigger when focused on input/textarea/select
    description: 'Create new brain dump'
  })

  // Ctrl+D: Duplicate current brain dump (only when no nodes selected)
  useHotkeys('ctrl+d', (event) => {
    event.preventDefault()
    if (selectedIdeaIds.size === 0 && currentBrainDumpId) {
      duplicateBrainDump(currentBrainDumpId)
    }
  }, {
    enableOnFormTags: false,
    description: 'Duplicate current brain dump (when no nodes selected)'
  })

  // Cmd+D: Duplicate selected nodes and edges
  useHotkeys('meta+d', (event) => {
    event.preventDefault()
    if (selectedIdeaIds.size > 0) {
      duplicateSelectedNodes()
    }
  }, {
    enableOnFormTags: false,
    description: 'Duplicate selected nodes and edges'
  })

  // Ctrl+/: Toggle side panel
  useHotkeys('ctrl+/', (event) => {
    event.preventDefault()
    toggleSidebar()
  }, {
    enableOnFormTags: false,
    description: 'Toggle side panel'
  })

  // Ctrl+Z / Cmd+Z: Undo (cross-platform)
  useHotkeys('ctrl+z, meta+z', async (event) => {
    debugKeyboard('Ctrl/Cmd+Z', 'Undo', canUndo)
    event.preventDefault()
    await undo()
  }, {
    enableOnFormTags: true, // Allow undo in input fields
    description: 'Undo last action'
  })

  // Ctrl+Shift+Z / Cmd+Shift+Z: Redo (cross-platform)
  useHotkeys('ctrl+shift+z, meta+shift+z', async (event) => {
    debugKeyboard('Ctrl/Cmd+Shift+Z', 'Redo', canRedo)
    event.preventDefault()
    await redo()
  }, {
    enableOnFormTags: true, // Allow redo in input fields
    description: 'Redo last undone action'
  })

  // Escape: Deselect nodes or cancel connection
  useHotkeys('escape', (event) => {
    event.preventDefault()
    if (isCreatingConnection) {
      cancelConnection()
    } else {
      clearSelection()
      selectIdea(null) // Also clear single selection used by detail modal
    }
  }, {
    enableOnFormTags: true, // Allow escape in input fields
    description: 'Deselect nodes or cancel connection'
  })
}