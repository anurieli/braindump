import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { BrainDumpsSlice, createBrainDumpsSlice } from './slices/brainDumpsSlice'
import { IdeasSlice, createIdeasSlice } from './slices/ideasSlice'
import { EdgesSlice, createEdgesSlice } from './slices/edgesSlice'
import { UiSlice, createUiSlice } from './slices/uiSlice'

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
    // Skip if we're in a batch operation
    if (isBatchOperation) return
    
    const ideasSnapshot = JSON.stringify(current.ideas)
    const edgesSnapshot = JSON.stringify(current.edges)
    
    // Only save if something actually changed
    if (ideasSnapshot !== lastIdeasSnapshot || edgesSnapshot !== lastEdgesSnapshot) {
      lastIdeasSnapshot = ideasSnapshot
      lastEdgesSnapshot = edgesSnapshot
      
      // Debounce history saves to avoid too many snapshots during rapid changes
      if (batchTimeout) clearTimeout(batchTimeout)
      batchTimeout = setTimeout(() => {
        undoRedoManager.saveState({
          ideas: JSON.parse(JSON.stringify(current.ideas)),
          edges: JSON.parse(JSON.stringify(current.edges))
        })
      }, 150)
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

  saveState(state: HistoryState) {
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
  }

  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.history[this.currentIndex]
    }
    return null
  }

  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      return this.history[this.currentIndex]
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

export const undo = () => {
  const previousState = undoRedoManager.undo()
  if (previousState) {
    useStore.setState(previousState)
  }
}

export const redo = () => {
  const nextState = undoRedoManager.redo()
  if (nextState) {
    useStore.setState(nextState)
  }
}

export const canUndo = () => undoRedoManager.canUndo()
export const canRedo = () => undoRedoManager.canRedo()
export const clearHistory = () => undoRedoManager.clear()

// Selector hook for checking if a specific idea is selected
export const useIsIdeaSelected = (id: string): boolean => {
  return useStore(state => state.selectedIdeaIds.has(id))
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