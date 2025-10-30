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
    saveCurrentState
  }
}