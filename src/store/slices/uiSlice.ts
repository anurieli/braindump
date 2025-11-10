import { StateCreator } from 'zustand'
import { ThemeType, Modal, UserPreferences } from '@/types'

export interface UiSlice {
  // State
  theme: ThemeType
  isGridVisible: boolean
  patternType: 'grid' | 'dots' | 'none'
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

  // Shortcut assistant state
  shortcutAssistant: {
    isVisible: boolean
    message: string
  } | null
  
  // Command key state
  isCommandKeyPressed: boolean

  // Performance settings
  enableAnimations: boolean
  renderQuality: 'low' | 'medium' | 'high'

  // Actions
  toggleTheme: () => void
  setTheme: (theme: ThemeType) => void
  toggleGrid: () => void
  setGridVisible: (visible: boolean) => void
  setPatternType: (pattern: 'grid' | 'dots' | 'none') => void
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
  
  // Shortcut assistant actions
  showShortcutAssistant: (message: string) => void
  hideShortcutAssistant: () => void
  
  // Command key actions
  setCommandKeyPressed: (pressed: boolean) => void
  
  // Performance
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => void
  toggleAnimations: () => void
  
  // User preferences
  loadUserPreferences: (userId: string) => Promise<void>
  savePreferencesToDB: (userId: string) => Promise<void>
  initializeFromPreferences: (preferences: UserPreferences) => void
}

export const createUiSlice: StateCreator<
  UiSlice,
  [],
  [],
  UiSlice
> = (set, get) => ({
  // Initial state - default to light theme
  theme: 'light',
  isGridVisible: false,
  patternType: 'none',
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

  // Shortcut assistant state
  shortcutAssistant: null,
  
  // Command key state
  isCommandKeyPressed: false,

  // Performance settings
  enableAnimations: true,
  renderQuality: 'high',

  // Actions
  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    }))
    // Manual save will be triggered by UI components
  },

  setTheme: (theme: ThemeType) => {
    set({ theme })
    // Manual save will be triggered by UI components
  },

  toggleGrid: () => {
    set(state => {
      // Cycle through: none -> dots -> grid -> none
      let newPatternType: 'grid' | 'dots' | 'none'
      if (state.patternType === 'none') {
        newPatternType = 'dots'
      } else if (state.patternType === 'dots') {
        newPatternType = 'grid'
      } else {
        newPatternType = 'none'
      }

      const newGridVisible = newPatternType !== 'none'

      return {
        patternType: newPatternType,
        isGridVisible: newGridVisible
      }
    })
    // Manual save will be triggered by UI components
  },

  setGridVisible: (visible: boolean) => {
    set({ isGridVisible: visible })
  },

  setPatternType: (pattern: 'grid' | 'dots' | 'none') => {
    set({ 
      patternType: pattern,
      isGridVisible: pattern !== 'none'
    })
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

  // Shortcut assistant actions
  showShortcutAssistant: (message: string) => {
    set({
      shortcutAssistant: {
        isVisible: true,
        message
      }
    })
  },

  hideShortcutAssistant: () => {
    set({ shortcutAssistant: null })
  },

  // Command key actions
  setCommandKeyPressed: (pressed: boolean) => {
    set({ isCommandKeyPressed: pressed })
  },

  // Performance
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => {
    set({ renderQuality: quality })
  },

  toggleAnimations: () => {
    set(state => ({
      enableAnimations: !state.enableAnimations
    }))
  },

  // User preferences management
  loadUserPreferences: async (userId: string) => {
    try {
      // Dynamic import to prevent blocking
      const { getUserPreferences } = await import('@/lib/userPreferences')
      const preferences = await getUserPreferences(userId)
      set({
        theme: preferences.theme,
        isGridVisible: preferences.gridSettings.isVisible,
        patternType: preferences.gridSettings.patternType,
        isSidebarOpen: preferences.ui.isSidebarOpen,
        isControlPanelOpen: preferences.ui.isControlPanelOpen,
        enableAnimations: preferences.ui.enableAnimations,
        renderQuality: preferences.ui.renderQuality,
      })
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Keep current defaults if loading fails
    }
  },

  savePreferencesToDB: async (userId: string) => {
    const state = get()
    
    const preferences: UserPreferences = {
      theme: state.theme,
      gridSettings: {
        isVisible: state.isGridVisible,
        patternType: state.patternType,
      },
      ui: {
        isSidebarOpen: state.isSidebarOpen,
        isControlPanelOpen: state.isControlPanelOpen,
        enableAnimations: state.enableAnimations,
        renderQuality: state.renderQuality,
      },
    }

    try {
      // Dynamic import to prevent blocking
      const { updateUserPreferences } = await import('@/lib/userPreferences')
      await updateUserPreferences(userId, preferences)
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  },

  initializeFromPreferences: (preferences: UserPreferences) => {
    set({
      theme: preferences.theme,
      isGridVisible: preferences.gridSettings.isVisible,
      patternType: preferences.gridSettings.patternType,
      isSidebarOpen: preferences.ui.isSidebarOpen,
      isControlPanelOpen: preferences.ui.isControlPanelOpen,
      enableAnimations: preferences.ui.enableAnimations,
      renderQuality: preferences.ui.renderQuality,
    })
  }
})