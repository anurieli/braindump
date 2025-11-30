/**
 * Centralized undo/redo hook to prevent conflicts between multiple components
 * implementing the same functionality
 */

import { useCallback, useEffect, useState } from 'react'
import { useStore } from '@/store'
import { undoDebugger } from '@/lib/undo-debug'

// Import undo/redo functions dynamically to avoid circular dependencies
let undoRedoFunctions: {
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean
} | null = null

async function getUndoRedoFunctions() {
  if (!undoRedoFunctions) {
    const module = await import('@/store')
    undoRedoFunctions = {
      undo: module.undo,
      redo: module.redo,
      canUndo: module.canUndo,
      canRedo: module.canRedo
    }
  }
  return undoRedoFunctions
}

export function useUndoRedo() {
  const [canUndoState, setCanUndoState] = useState(false)
  const [canRedoState, setCanRedoState] = useState(false)
  const [isPerformingAction, setIsPerformingAction] = useState(false)
  
  // Track store changes to update states
  const ideas = useStore(state => state.ideas)
  const edges = useStore(state => state.edges)
  
  // Update undo/redo availability when store changes
  useEffect(() => {
    async function updateStates() {
      const functions = await getUndoRedoFunctions()
      setCanUndoState(functions.canUndo())
      setCanRedoState(functions.canRedo())
    }
    updateStates()
  }, [ideas, edges])

  const handleUndo = useCallback(async () => {
    if (isPerformingAction) {
      undoDebugger.log('warning', '⚠️ Undo already in progress, ignoring duplicate call')
      return false
    }

    try {
      setIsPerformingAction(true)
      const functions = await getUndoRedoFunctions()
      
      if (!functions.canUndo()) {
        undoDebugger.log('warning', '⚠️ Cannot undo - no history available')
        return false
      }

      undoDebugger.log('operation', '🔄 Centralized undo starting')
      await functions.undo()
      
      // Update states immediately after operation
      setCanUndoState(functions.canUndo())
      setCanRedoState(functions.canRedo())
      
      undoDebugger.log('success', '✅ Centralized undo completed')
      return true
    } catch (error) {
      undoDebugger.log('error', '❌ Centralized undo failed', { error: error.message })
      return false
    } finally {
      setIsPerformingAction(false)
    }
  }, [isPerformingAction])

  const handleRedo = useCallback(async () => {
    if (isPerformingAction) {
      undoDebugger.log('warning', '⚠️ Redo already in progress, ignoring duplicate call')
      return false
    }

    try {
      setIsPerformingAction(true)
      const functions = await getUndoRedoFunctions()
      
      if (!functions.canRedo()) {
        undoDebugger.log('warning', '⚠️ Cannot redo - no future history available')
        return false
      }

      undoDebugger.log('operation', '🔄 Centralized redo starting')
      await functions.redo()
      
      // Update states immediately after operation
      setCanUndoState(functions.canUndo())
      setCanRedoState(functions.canRedo())
      
      undoDebugger.log('success', '✅ Centralized redo completed')
      return true
    } catch (error) {
      undoDebugger.log('error', '❌ Centralized redo failed', { error: error.message })
      return false
    } finally {
      setIsPerformingAction(false)
    }
  }, [isPerformingAction])

  return {
    canUndo: canUndoState,
    canRedo: canRedoState,
    isPerformingAction,
    undo: handleUndo,
    redo: handleRedo
  }
}

// Global singleton to prevent duplicate operations from multiple components
let globalUndoRedoInProgress = false

export function useGlobalUndoRedo() {
  const localHandler = useUndoRedo()

  const globalUndo = useCallback(async () => {
    if (globalUndoRedoInProgress) {
      undoDebugger.log('warning', '⚠️ Global undo already in progress, ignoring call')
      return false
    }

    globalUndoRedoInProgress = true
    try {
      return await localHandler.undo()
    } finally {
      globalUndoRedoInProgress = false
    }
  }, [localHandler])

  const globalRedo = useCallback(async () => {
    if (globalUndoRedoInProgress) {
      undoDebugger.log('warning', '⚠️ Global redo already in progress, ignoring call')
      return false
    }

    globalUndoRedoInProgress = true
    try {
      return await localHandler.redo()
    } finally {
      globalUndoRedoInProgress = false
    }
  }, [localHandler])

  return {
    ...localHandler,
    undo: globalUndo,
    redo: globalRedo,
    isGloballyInProgress: globalUndoRedoInProgress
  }
}