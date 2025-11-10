'use client'

import { useHotkeys } from 'react-hotkeys-hook'
import { useStore, useStoreActions } from '@/store'

export function useGlobalKeyboardShortcuts() {
  const createBrainDump = useStore(state => state.createBrainDump)
  const duplicateBrainDump = useStore(state => state.duplicateBrainDump)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const currentBrainDumpId = useStore(state => state.currentBrainDumpId)
  const clearSelection = useStore(state => state.clearSelection)
  const cancelConnection = useStore(state => state.cancelConnection)
  const isCreatingConnection = useStore(state => state.isCreatingConnection)
  const selectIdea = useStore(state => state.selectIdea)

  // Undo/Redo actions
  const { undo, redo, canUndo, canRedo } = useStoreActions()

  // Ctrl+N: Create new brain dump
  useHotkeys('ctrl+n', (event) => {
    event.preventDefault()
    createBrainDump('New Brain Dump')
  }, {
    enableOnFormTags: false, // Don't trigger when focused on input/textarea/select
    description: 'Create new brain dump'
  })

  // Ctrl+D: Duplicate current brain dump
  useHotkeys('ctrl+d', (event) => {
    event.preventDefault()
    if (currentBrainDumpId) {
      duplicateBrainDump(currentBrainDumpId)
    }
  }, {
    enableOnFormTags: false,
    description: 'Duplicate current brain dump'
  })

  // Ctrl+/: Toggle side panel
  useHotkeys('ctrl+/', (event) => {
    event.preventDefault()
    toggleSidebar()
  }, {
    enableOnFormTags: false,
    description: 'Toggle side panel'
  })

  // Ctrl+Z: Undo
  useHotkeys('ctrl+z', async (event) => {
    console.log('🎹 Ctrl+Z pressed, canUndo:', canUndo())
    event.preventDefault()
    if (canUndo()) {
      console.log('🔄 Calling undo...')
      await undo()
      console.log('✅ Undo completed')
    } else {
      console.log('❌ Cannot undo - no history')
    }
  }, {
    enableOnFormTags: true, // Allow undo in input fields
    description: 'Undo last action'
  })

  // Ctrl+Shift+Z: Redo
  useHotkeys('ctrl+shift+z', async (event) => {
    console.log('🎹 Ctrl+Shift+Z pressed, canRedo:', canRedo())
    event.preventDefault()
    if (canRedo()) {
      console.log('🔄 Calling redo...')
      await redo()
      console.log('✅ Redo completed')
    } else {
      console.log('❌ Cannot redo - no future history')
    }
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