import { StateCreator } from 'zustand'
import { ThemeType, Modal } from '@/types'

export interface UiSlice {
  // State
  theme: ThemeType
  isGridVisible: boolean
  activeModal: Modal
  isSidebarOpen: boolean
  isControlPanelOpen: boolean
  shortcuts: Record<string, boolean>

  // Canvas UI state
  isDragging: boolean
  isPanning: boolean
  isSelecting: boolean
  selectionBox: {
    startX: number
    startY: number
    endX: number
    endY: number
  } | null
  selectedIdeaIds: Set<string>
  selectedEdgeIds: Set<string>
  
  // Connection state
  isCreatingConnection: boolean
  connectionSourceId: string | null
  connectionStartPosition: { x: number; y: number } | null
  hoveredNodeId: string | null
  touchedNodesInConnection: Set<string>
  
  // Drag state
  draggedIdeaId: string | null
  dragHoverTargetId: string | null

  // Quick editor state
  quickEditor: {
    isActive: boolean
    position: { x: number; y: number }
    text: string
  } | null

  // Performance settings
  enableAnimations: boolean
  renderQuality: 'low' | 'medium' | 'high'

  // Actions
  toggleTheme: () => void
  setTheme: (theme: ThemeType) => void
  toggleGrid: () => void
  setGridVisible: (visible: boolean) => void
  openModal: (modal: Modal) => void
  closeModal: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleControlPanel: () => void
  setControlPanelOpen: (open: boolean) => void
  
  // Canvas interaction actions
  setDragging: (dragging: boolean) => void
  setPanning: (panning: boolean) => void
  setSelecting: (selecting: boolean) => void
  setSelectionBox: (box: UiSlice['selectionBox']) => void
  
  // Selection management actions
  setSelection: (ids: string[]) => void
  setEdgeSelection: (ids: string[]) => void
  addToSelection: (ids: string[]) => void
  addToEdgeSelection: (ids: string[]) => void
  removeFromSelection: (ids: string[]) => void
  removeFromEdgeSelection: (ids: string[]) => void
  toggleEdgeSelection: (id: string, multi?: boolean) => void
  clearSelection: () => void
  
  // Connection actions
  startConnection: (sourceId: string, screenX: number, screenY: number) => void
  cancelConnection: () => void
  setHoveredNodeId: (id: string | null) => void
  addTouchedNodeInConnection: (id: string) => void
  clearTouchedNodesInConnection: () => void
  
  // Drag actions
  setDraggedIdeaId: (id: string | null) => void
  setDragHoverTargetId: (id: string | null) => void
  
  // Quick editor actions
  showQuickEditor: (x: number, y: number, initialText?: string) => void
  hideQuickEditor: () => void
  updateQuickEditorText: (text: string) => void
  
  // Keyboard shortcuts
  setShortcutPressed: (key: string, pressed: boolean) => void
  
  // Performance
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => void
  toggleAnimations: () => void
}

export const createUiSlice: StateCreator<
  UiSlice,
  [],
  [],
  UiSlice
> = (set) => ({
  // Initial state - default to light theme
  theme: 'light',
  isGridVisible: true,
  activeModal: null,
  isSidebarOpen: true,
  isControlPanelOpen: false,
  shortcuts: {},

  // Canvas UI state
  isDragging: false,
  isPanning: false,
  isSelecting: false,
  selectionBox: null,
  selectedIdeaIds: new Set<string>(),
  selectedEdgeIds: new Set<string>(),
  
  // Connection state
  isCreatingConnection: false,
  connectionSourceId: null,
  connectionStartPosition: null,
  hoveredNodeId: null,
  touchedNodesInConnection: new Set<string>(),
  
  // Drag state
  draggedIdeaId: null,
  dragHoverTargetId: null,

  // Quick editor state
  quickEditor: null,

  // Performance settings
  enableAnimations: true,
  renderQuality: 'high',

  // Actions
  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'light' ? 'dots-dark' : 'light'
    }))
  },

  setTheme: (theme: ThemeType) => {
    set({ theme })
  },

  toggleGrid: () => {
    set(state => ({
      isGridVisible: !state.isGridVisible
    }))
  },

  setGridVisible: (visible: boolean) => {
    set({ isGridVisible: visible })
  },

  openModal: (modal: Modal) => {
    set({ activeModal: modal })
  },

  closeModal: () => {
    set({ activeModal: null })
  },

  toggleSidebar: () => {
    set(state => ({
      isSidebarOpen: !state.isSidebarOpen
    }))
  },

  setSidebarOpen: (open: boolean) => {
    set({ isSidebarOpen: open })
  },

  toggleControlPanel: () => {
    set(state => ({
      isControlPanelOpen: !state.isControlPanelOpen
    }))
  },

  setControlPanelOpen: (open: boolean) => {
    set({ isControlPanelOpen: open })
  },

  // Canvas interaction actions
  setDragging: (dragging: boolean) => {
    set({ isDragging: dragging })
  },

  setPanning: (panning: boolean) => {
    set({ isPanning: panning })
  },

  setSelecting: (selecting: boolean) => {
    set({ isSelecting: selecting })
  },

  setSelectionBox: (box: UiSlice['selectionBox']) => {
    set({ selectionBox: box })
  },

  // Selection management actions
  setSelection: (ids: string[]) => {
    set({ selectedIdeaIds: new Set(ids) })
  },

  setEdgeSelection: (ids: string[]) => {
    set({ selectedEdgeIds: new Set(ids) })
  },

  addToSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedIdeaIds)
      ids.forEach(id => newSelection.add(id))
      return { selectedIdeaIds: newSelection }
    })
  },

  addToEdgeSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedEdgeIds)
      ids.forEach(id => newSelection.add(id))
      return { selectedEdgeIds: newSelection }
    })
  },

  removeFromSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedIdeaIds)
      ids.forEach(id => newSelection.delete(id))
      return { selectedIdeaIds: newSelection }
    })
  },

  removeFromEdgeSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedEdgeIds)
      ids.forEach(id => newSelection.delete(id))
      return { selectedEdgeIds: newSelection }
    })
  },

  toggleEdgeSelection: (id: string, multi = false) => {
    set(state => {
      const newSelection = multi ? new Set(state.selectedEdgeIds) : new Set<string>()
      
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      
      // Clear idea selection when selecting edges
      return { selectedEdgeIds: newSelection, selectedIdeaIds: new Set<string>() }
    })
  },

  clearSelection: () => {
    set({ selectedIdeaIds: new Set<string>(), selectedEdgeIds: new Set<string>() })
  },
  
  // Connection actions
  startConnection: (sourceId: string, screenX: number, screenY: number) => {
    set({
      isCreatingConnection: true,
      connectionSourceId: sourceId,
      connectionStartPosition: { x: screenX, y: screenY },
      touchedNodesInConnection: new Set<string>(),
    })
  },
  
  cancelConnection: () => {
    set({
      isCreatingConnection: false,
      connectionSourceId: null,
      connectionStartPosition: null,
      hoveredNodeId: null,
      touchedNodesInConnection: new Set<string>(),
    })
  },
  
  setHoveredNodeId: (id: string | null) => {
    set({ hoveredNodeId: id })
  },
  
  addTouchedNodeInConnection: (id: string) => {
    set(state => {
      const newTouched = new Set(state.touchedNodesInConnection)
      newTouched.add(id)
      return { touchedNodesInConnection: newTouched }
    })
  },
  
  clearTouchedNodesInConnection: () => {
    set({ touchedNodesInConnection: new Set<string>() })
  },

  // Drag actions
  setDraggedIdeaId: (id: string | null) => {
    set({ draggedIdeaId: id })
  },

  setDragHoverTargetId: (id: string | null) => {
    set({ dragHoverTargetId: id })
  },

  // Quick editor actions
  showQuickEditor: (x: number, y: number, initialText = '') => {
    set({
      quickEditor: {
        isActive: true,
        position: { x, y },
        text: initialText
      }
    })
  },

  hideQuickEditor: () => {
    set({ quickEditor: null })
  },

  updateQuickEditorText: (text: string) => {
    set(state => ({
      quickEditor: state.quickEditor ? {
        ...state.quickEditor,
        text
      } : null
    }))
  },

  // Keyboard shortcuts
  setShortcutPressed: (key: string, pressed: boolean) => {
    set(state => ({
      shortcuts: {
        ...state.shortcuts,
        [key]: pressed
      }
    }))
  },

  // Performance
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => {
    set({ renderQuality: quality })
  },

  toggleAnimations: () => {
    set(state => ({
      enableAnimations: !state.enableAnimations
    }))
  }
})