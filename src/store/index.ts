import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { BrainDumpsSlice, createBrainDumpsSlice } from './slices/brainDumpsSlice'
import { IdeasSlice, createIdeasSlice } from './slices/ideasSlice'
import { EdgesSlice, createEdgesSlice } from './slices/edgesSlice'
import { UiSlice, createUiSlice } from './slices/uiSlice'
import { undoDebugger, debugHistory, debugError } from '@/lib/undo-debug'

export type StoreState = BrainDumpsSlice & IdeasSlice & EdgesSlice & UiSlice

// Create the main store
export const useStore = create<StoreState>()(
  subscribeWithSelector(
    (...a) => ({
      ...createBrainDumpsSlice(...a),
      ...createIdeasSlice(...a),
      ...createEdgesSlice(...a),
      ...createUiSlice(...a),
    })
  )
)

// Batch operation tracking
let isBatchOperation = false
let batchTimeout: NodeJS.Timeout | null = null
let lastIdeasSnapshot = ''
let lastEdgesSnapshot = ''

// Start a batch operation (prevents individual history saves)
export const startBatch = () => {
  isBatchOperation = true
  if (batchTimeout) {
    clearTimeout(batchTimeout)
    batchTimeout = null
  }
}

// End a batch operation and save one history snapshot
export const endBatch = () => {
  isBatchOperation = false
  // Save history after a small delay to ensure all state updates have completed
  if (batchTimeout) clearTimeout(batchTimeout)
  batchTimeout = setTimeout(() => {
    const state = useStore.getState()
    const ideasSnapshot = JSON.stringify(state.ideas)
    const edgesSnapshot = JSON.stringify(state.edges)
    
    if (ideasSnapshot !== lastIdeasSnapshot || edgesSnapshot !== lastEdgesSnapshot) {
      lastIdeasSnapshot = ideasSnapshot
      lastEdgesSnapshot = edgesSnapshot
      undoRedoManager.saveState({
        ideas: JSON.parse(JSON.stringify(state.ideas)),
        edges: JSON.parse(JSON.stringify(state.edges))
      })
    }
  }, 50)
}

// Subscribe to changes and auto-save history (only when not in a batch)
useStore.subscribe(
  (state) => ({ ideas: state.ideas, edges: state.edges }),
  (current) => {
    undoDebugger.log('operation', '👂 Subscription triggered - state changed')

    // Skip if we're in a batch operation
    if (isBatchOperation) return

    const ideasSnapshot = JSON.stringify(current.ideas)
    const edgesSnapshot = JSON.stringify(current.edges)

    // Only save if something actually changed
    if (ideasSnapshot !== lastIdeasSnapshot || edgesSnapshot !== lastEdgesSnapshot) {
      undoDebugger.log('state', '📝 State actually changed, scheduling debounced save')
      lastIdeasSnapshot = ideasSnapshot
      lastEdgesSnapshot = edgesSnapshot

      // Debounce history saves to avoid too many snapshots during rapid changes
      // Skip debounced saving if we just did an immediate save (within last 200ms)
      const now = Date.now()
      const timeSinceLastImmediateSave = now - (undoRedoManager as any).lastImmediateSave || 0
      if (timeSinceLastImmediateSave > 200) {
        if (batchTimeout) clearTimeout(batchTimeout)
        batchTimeout = setTimeout(() => {
          undoDebugger.log('state', '💾 Debounced save executing')
          undoRedoManager.saveState({
            ideas: JSON.parse(JSON.stringify(current.ideas)),
            edges: JSON.parse(JSON.stringify(current.edges))
          }, false)
        }, 150)
      } else {
        undoDebugger.log('warning', '⏰ Skipping debounced save - too soon after immediate save')
      }
    } else {
      undoDebugger.log('operation', '📝 State changed but no actual difference detected')
    }
  },
  { equalityFn: (a, b) => {
    return JSON.stringify(a.ideas) === JSON.stringify(b.ideas) &&
           JSON.stringify(a.edges) === JSON.stringify(b.edges)
  }}
)

// Manual undo/redo implementation
interface HistoryState {
  ideas: StoreState['ideas']
  edges: StoreState['edges']
}

class UndoRedoManager {
  private history: HistoryState[] = []
  private currentIndex = -1
  private maxHistory = 10
  public lastImmediateSave = 0

  saveState(state: HistoryState, isImmediate = false) {
    // Validate state before saving
    const validation = undoDebugger.validateState(state)
    if (!validation.valid) {
      undoDebugger.log('error', `❌ Invalid state detected, not saving to history`, { errors: validation.errors })
      return
    }

    debugHistory('History Save', state, isImmediate)

    if (isImmediate) {
      this.lastImmediateSave = Date.now()
    }

    // Remove any future history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(state)))
    this.currentIndex++

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history.shift()
      this.currentIndex--
    }

    undoDebugger.log('success', `✅ State saved, new history length: ${this.history.length}, currentIndex: ${this.currentIndex}`)
  }

  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      const state = this.history[this.currentIndex]

      // Validate the restored state
      const validation = undoDebugger.validateState(state)
      if (!validation.valid) {
        undoDebugger.log('error', `❌ Invalid state in undo history at index ${this.currentIndex}`, { errors: validation.errors })
        // Move back to avoid staying in invalid state
        this.currentIndex++
        return null
      }

      return state
    }
    return null
  }

  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      const state = this.history[this.currentIndex]

      // Validate the restored state
      const validation = undoDebugger.validateState(state)
      if (!validation.valid) {
        undoDebugger.log('error', `❌ Invalid state in redo history at index ${this.currentIndex}`, { errors: validation.errors })
        // Move back to avoid staying in invalid state
        this.currentIndex--
        return null
      }

      return state
    }
    return null
  }

  clear() {
    this.history = []
    this.currentIndex = -1
  }

  canUndo(): boolean {
    return this.currentIndex > 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  // Additional validation methods
  validateHistoryIntegrity(): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    // Check that all states in history are valid
    for (let i = 0; i < this.history.length; i++) {
      const state = this.history[i]
      const validation = undoDebugger.validateState(state)
      if (!validation.valid) {
        errors.push(`History state at index ${i} is invalid: ${validation.errors.join(', ')}`)
      }
    }

    // Check current index bounds
    if (this.currentIndex < -1 || this.currentIndex >= this.history.length) {
      errors.push(`Current index ${this.currentIndex} is out of bounds (history length: ${this.history.length})`)
    }

    return { valid: errors.length === 0, errors }
  }

  // Get detailed history information
  getHistoryInfo(): any {
    return {
      length: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      maxHistory: this.maxHistory,
      integrity: this.validateHistoryIntegrity(),
      states: this.history.map((state, index) => ({
        index,
        ideasCount: Object.keys(state.ideas).length,
        edgesCount: Object.keys(state.edges).length,
        isCurrent: index === this.currentIndex
      }))
    }
  }
}

export const undoRedoManager = new UndoRedoManager()

// Helper functions for undo/redo
export const saveCurrentState = () => {
  const state = useStore.getState()
  undoRedoManager.saveState({
    ideas: state.ideas,
    edges: state.edges
  })
}

export const undo = async () => {
  undoDebugger.log('operation', '🔄 Undo called')
  const currentState = useStore.getState()
  undoDebugger.log('state', '📊 Current state before undo', null, {
    ideasCount: Object.keys(currentState.ideas).length,
    edgesCount: Object.keys(currentState.edges).length
  })

  const previousState = undoRedoManager.undo()
  undoDebugger.log('state', '📋 Previous state from history', null, previousState ? {
    ideasCount: Object.keys(previousState.ideas).length,
    edgesCount: Object.keys(previousState.edges).length
  } : { state: 'null' })

  if (previousState) {
    // Find items that were deleted (exist in previous but not in current)
    const restoredIdeas: string[] = []
    const restoredEdges: string[] = []
    
    // Check for restored ideas
    for (const id in previousState.ideas) {
      if (!currentState.ideas[id]) {
        restoredIdeas.push(id)
      }
    }
    
    // Check for restored edges
    for (const id in previousState.edges) {
      if (!currentState.edges[id]) {
        restoredEdges.push(id)
      }
    }
    
    // Check for deleted items (exist in current but not in previous)
    const deletedIdeas: string[] = []
    const deletedEdges: string[] = []
    
    for (const id in currentState.ideas) {
      if (!previousState.ideas[id]) {
        deletedIdeas.push(id)
      }
    }
    
    for (const id in currentState.edges) {
      if (!previousState.edges[id]) {
        deletedEdges.push(id)
      }
    }
    
    // First restore the state locally
    useStore.setState(previousState)
    
    // Then sync with database
    const { supabase } = await import('@/lib/supabase')

    // Re-insert restored ideas FIRST (so edges can reference them)
    if (restoredIdeas.length > 0) {
      const ideasToInsert = restoredIdeas.map(id => previousState.ideas[id])
      console.log(`🔄 Restoring ${restoredIdeas.length} ideas:`, ideasToInsert.map(i => i.id))

      try {
        const { error, data } = await supabase
          .from('ideas')
          .upsert(ideasToInsert, { onConflict: 'id' })
          .select()

        if (error) {
          console.error('❌ Failed to restore ideas:', error)
          debugError('undo-ideas-restore', error, { restoredIdeas, ideasToInsert })
        } else {
          console.log(`✅ Restored ${restoredIdeas.length} ideas:`, data?.map(d => d.id))
        }
      } catch (error) {
        console.error('❌ Exception restoring ideas:', error)
        debugError('undo-ideas-restore-exception', error, { restoredIdeas })
      }
    }
    
    // Re-insert restored edges AFTER ideas are restored (to satisfy foreign keys)
    if (restoredEdges.length > 0) {
      const edgesToInsert = restoredEdges.map(id => previousState.edges[id])
      console.log(`🔄 Restoring ${restoredEdges.length} edges:`, edgesToInsert.map(e => ({
        id: e.id,
        parent: e.parent_id,
        child: e.child_id
      })))
      
      const { error, data } = await supabase
        .from('edges')
        .upsert(edgesToInsert, { onConflict: 'id' })
        .select()
      
      if (error) {
        console.error('❌ Failed to restore edges:', error)
        console.error('Edge data that failed:', edgesToInsert)
      } else {
        console.log(`✅ Restored ${restoredEdges.length} edges:`, data)
      }
    }
    
    // Delete items that were added after this point
    if (deletedIdeas.length > 0) {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .in('id', deletedIdeas)
      
      if (error) {
        console.error('Failed to delete ideas during undo:', error)
      }
    }
    
    if (deletedEdges.length > 0) {
      const { error } = await supabase
        .from('edges')
        .delete()
        .in('id', deletedEdges)
      
      if (error) {
        console.error('Failed to delete edges during undo:', error)
      }
    }
  }
}

export const redo = async () => {
  undoDebugger.log('operation', '🔄 Redo called')
  const currentState = useStore.getState()
  undoDebugger.log('state', '📊 Current state before redo', null, {
    ideasCount: Object.keys(currentState.ideas).length,
    edgesCount: Object.keys(currentState.edges).length
  })

  const nextState = undoRedoManager.redo()
  undoDebugger.log('state', '📋 Next state from history', null, nextState ? {
    ideasCount: Object.keys(nextState.ideas).length,
    edgesCount: Object.keys(nextState.edges).length
  } : { state: 'null' })

  if (nextState) {
    // Find items that were deleted (exist in current but not in next)
    const deletedIdeas: string[] = []
    const deletedEdges: string[] = []
    
    for (const id in currentState.ideas) {
      if (!nextState.ideas[id]) {
        deletedIdeas.push(id)
      }
    }
    
    for (const id in currentState.edges) {
      if (!nextState.edges[id]) {
        deletedEdges.push(id)
      }
    }
    
    // Find items that were restored (exist in next but not in current)
    const restoredIdeas: string[] = []
    const restoredEdges: string[] = []

    for (const id in nextState.ideas) {
      if (!currentState.ideas[id]) {
        restoredIdeas.push(id)
      }
    }

    for (const id in nextState.edges) {
      if (!currentState.edges[id]) {
        restoredEdges.push(id)
      }
    }

    console.log('🔄 Redo analysis:', {
      deletedIdeas: deletedIdeas.length,
      deletedEdges: deletedEdges.length,
      restoredIdeas: restoredIdeas.length,
      restoredEdges: restoredEdges.length
    })
    
    // First restore the state locally
    useStore.setState(nextState)
    
    // Then sync with database
    const { supabase } = await import('@/lib/supabase')
    
    // Delete items
    if (deletedIdeas.length > 0) {
      console.log(`🔄 Redo: Deleting ${deletedIdeas.length} ideas:`, deletedIdeas)

      try {
        const { error, data } = await supabase
          .from('ideas')
          .delete()
          .in('id', deletedIdeas)
          .select()

        if (error) {
          console.error('❌ Failed to delete ideas during redo:', error)
          debugError('redo-ideas-delete', error, { deletedIdeas })
        } else {
          console.log(`✅ Redo: Deleted ${deletedIdeas.length} ideas:`, data?.map(d => d.id))
        }
      } catch (error) {
        console.error('❌ Exception deleting ideas during redo:', error)
        debugError('redo-ideas-delete-exception', error, { deletedIdeas })
      }
    }
    
    if (deletedEdges.length > 0) {
      console.log(`🔄 Redo: Deleting ${deletedEdges.length} edges:`, deletedEdges)

      try {
        const { error, data } = await supabase
          .from('edges')
          .delete()
          .in('id', deletedEdges)
          .select()

        if (error) {
          console.error('❌ Failed to delete edges during redo:', error)
          debugError('redo-edges-delete', error, { deletedEdges })
        } else {
          console.log(`✅ Redo: Deleted ${deletedEdges.length} edges:`, data?.map(d => d.id))
        }
      } catch (error) {
        console.error('❌ Exception deleting edges during redo:', error)
        debugError('redo-edges-delete-exception', error, { deletedEdges })
      }
    }
    
    // Re-insert restored items
    if (restoredIdeas.length > 0) {
      const ideasToInsert = restoredIdeas.map(id => nextState.ideas[id])
      const { error } = await supabase
        .from('ideas')
        .upsert(ideasToInsert, { onConflict: 'id' })
      
      if (error) {
        console.error('Failed to restore ideas during redo:', error)
      }
    }
    
    if (restoredEdges.length > 0) {
      const edgesToInsert = restoredEdges.map(id => nextState.edges[id])
      const { error } = await supabase
        .from('edges')
        .upsert(edgesToInsert, { onConflict: 'id' })
      
      if (error) {
        console.error('Failed to restore edges during redo:', error)
      }
    }
  }
}

export const canUndo = () => undoRedoManager.canUndo()
export const canRedo = () => undoRedoManager.canRedo()
export const clearHistory = () => undoRedoManager.clear()

// Selector hook for checking if a specific idea is selected
export const useIsIdeaSelected = (id: string): boolean => {
  return useStore(state => state.selectedIdeaIds.has(id))
}

// Global debugging functions
if (typeof window !== 'undefined') {
  (window as any).undoDebugInfo = {
    historyInfo: () => undoRedoManager.getHistoryInfo(),
    validateHistory: () => undoRedoManager.validateHistoryIntegrity(),
    currentState: () => useStore.getState()
  }
}

// Export store actions for easier access
export const useStoreActions = () => {
  const store = useStore()
  return {
    // Brain dumps
    loadBrainDumps: store.loadBrainDumps,
    switchBrainDump: store.switchBrainDump,
    createBrainDump: store.createBrainDump,
    updateViewport: store.updateViewport,

    // Ideas
    loadIdeas: store.loadIdeas,
    addIdea: store.addIdea,
    updateIdeaText: store.updateIdeaText,
    updateIdeaPosition: store.updateIdeaPosition,
    deleteIdea: store.deleteIdea,
    selectIdea: store.selectIdea,

    // Edges
    loadEdges: store.loadEdges,
    loadEdgeTypes: store.loadEdgeTypes,
    addEdge: store.addEdge,
    updateEdge: store.updateEdge,
    deleteEdge: store.deleteEdge,

    // UI
    toggleTheme: store.toggleTheme,
    toggleGrid: store.toggleGrid,
    openModal: store.openModal,
    closeModal: store.closeModal,

    // Auto-relate mode
    setAutoRelateMode: store.setAutoRelateMode,
    clearAutoRelateMode: store.clearAutoRelateMode,

    // User preferences
    savePreferencesToDB: store.savePreferencesToDB,

    // Node duplication
    duplicateSelectedNodes: async () => {
      const state = useStore.getState()
      const selectedIdeaIds = Array.from(state.selectedIdeaIds)
      const selectedEdgeIds = Array.from(state.selectedEdgeIds)

      if (selectedIdeaIds.length === 0) {
        console.log('No nodes selected for duplication')
        return
      }

      // Start batch operation
      startBatch()

      try {
        // Create ID mapping for duplicated ideas
        const idMapping: Record<string, string> = {}
        const duplicatedIdeas: string[] = []
        const duplicatedEdges: string[] = []

        // Duplicate selected ideas with offset positions
        for (const ideaId of selectedIdeaIds) {
          const originalIdea = state.ideas[ideaId]
          if (!originalIdea) continue

          const offset = 20 // Offset duplicated nodes by 20px
          const newPosition = {
            x: originalIdea.position_x + offset,
            y: originalIdea.position_y + offset
          }

          // Create new idea
          const newIdeaId = await store.addIdea(originalIdea.text, newPosition)
          idMapping[ideaId] = newIdeaId
          duplicatedIdeas.push(newIdeaId)

          // Copy attachments if any
          if (originalIdea.attachments && originalIdea.attachments.length > 0) {
            // Note: Attachment duplication would need additional implementation
            // For now, we'll just duplicate the text-based idea
          }
        }

        // Duplicate edges between selected nodes
        for (const edgeId of selectedEdgeIds) {
          const originalEdge = state.edges[edgeId]
          if (!originalEdge) continue

          // Only duplicate edges where both source and target are selected (and thus duplicated)
          const newSourceId = idMapping[originalEdge.parent_id]
          const newTargetId = idMapping[originalEdge.child_id]

          if (newSourceId && newTargetId) {
            try {
              const newEdgeId = await store.addEdge(newSourceId, newTargetId, originalEdge.type, originalEdge.note)
              duplicatedEdges.push(newEdgeId)
            } catch (error) {
              console.warn('Failed to duplicate edge:', error)
            }
          }
        }

        console.log(`Duplicated ${duplicatedIdeas.length} nodes and ${duplicatedEdges.length} edges`)

        // Select the newly duplicated nodes
        store.setSelection(duplicatedIdeas)

      } catch (error) {
        console.error('Failed to duplicate selected nodes:', error)
      } finally {
        // End batch operation
        endBatch()
      }
    },

    // Undo/Redo
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    saveCurrentState,
    startBatch,
    endBatch
  }
}