import { StateCreator } from 'zustand'
import { Theme, Modal } from '@/types'

export interface UiSlice {
  // State
  theme: Theme
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

  // Performance settings
  enableAnimations: boolean
  renderQuality: 'low' | 'medium' | 'high'

  // Actions
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
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
  addToSelection: (ids: string[]) => void
  removeFromSelection: (ids: string[]) => void
  clearSelection: () => void
  
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
  // Initial state - detect system preference
  theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
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

  // Performance settings
  enableAnimations: true,
  renderQuality: 'high',

  // Actions
  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    }))
  },

  setTheme: (theme: Theme) => {
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

  addToSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedIdeaIds)
      ids.forEach(id => newSelection.add(id))
      return { selectedIdeaIds: newSelection }
    })
  },

  removeFromSelection: (ids: string[]) => {
    set(state => {
      const newSelection = new Set(state.selectedIdeaIds)
      ids.forEach(id => newSelection.delete(id))
      return { selectedIdeaIds: newSelection }
    })
  },

  clearSelection: () => {
    set({ selectedIdeaIds: new Set<string>() })
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