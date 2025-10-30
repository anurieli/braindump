import { StateCreator } from 'zustand'
import { BrainDump, Viewport } from '@/types'
import { supabase } from '@/lib/supabase'
import type { StoreState } from '../index'

export interface BrainDumpsSlice {
  // State
  brainDumps: BrainDump[]
  currentBrainDumpId: string | null
  viewport: Viewport
  isLoading: boolean
  error: string | null

  // Actions
  loadBrainDumps: () => Promise<void>
  switchBrainDump: (id: string) => Promise<void>
  createBrainDump: (name?: string) => Promise<string>
  updateBrainDumpName: (id: string, name: string) => Promise<void>
  archiveBrainDump: (id: string) => Promise<void>
  updateViewport: (viewport: Viewport) => void
  saveViewport: () => Promise<void>

  // Selectors
  getCurrentBrainDump: () => BrainDump | null
}

export const createBrainDumpsSlice: StateCreator<
  StoreState,
  [],
  [],
  BrainDumpsSlice
> = (set, get) => ({
  // Initial state
  brainDumps: [],
  currentBrainDumpId: null,
  viewport: { x: 0, y: 0, zoom: 1.0 },
  isLoading: false,
  error: null,

  // Actions
  loadBrainDumps: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('brain_dumps')
        .select('*')
        .is('archived_at', null)
        .order('updated_at', { ascending: false })

      if (error) throw error

      set({ 
        brainDumps: data || [],
        isLoading: false 
      })

      // If no current brain dump is selected, select the first one
      const currentId = get().currentBrainDumpId
      if (!currentId && data && data.length > 0) {
        get().switchBrainDump(data[0].id)
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load brain dumps',
        isLoading: false 
      })
    }
  },

  switchBrainDump: async (id: string) => {
    const brainDump = get().brainDumps.find(bd => bd.id === id)
    if (!brainDump) return

    // Save current viewport before switching
    if (get().currentBrainDumpId) {
      await get().saveViewport()
    }

    // Switch to new brain dump and restore its viewport
    set({
      currentBrainDumpId: id,
      viewport: {
        x: brainDump.viewport_x,
        y: brainDump.viewport_y,
        zoom: brainDump.viewport_zoom
      }
    })
  },

  createBrainDump: async (name = 'Untitled Dump') => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('brain_dumps')
        .insert([{ name }])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from insert')

      // Add to local state
      set(state => ({
        brainDumps: [data, ...state.brainDumps],
        isLoading: false
      }))

      // Switch to the new brain dump
      await get().switchBrainDump(data.id)

      return data.id
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create brain dump',
        isLoading: false
      })
      throw error
    }
  },

  updateBrainDumpName: async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('brain_dumps')
        .update({ name })
        .eq('id', id)

      if (error) throw error

      // Update local state
      set(state => ({
        brainDumps: state.brainDumps.map(bd => 
          bd.id === id ? { ...bd, name } : bd
        )
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update brain dump name'
      })
    }
  },

  archiveBrainDump: async (id: string) => {
    try {
      const { error } = await supabase
        .from('brain_dumps')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      set(state => ({
        brainDumps: state.brainDumps.filter(bd => bd.id !== id),
        currentBrainDumpId: state.currentBrainDumpId === id ? null : state.currentBrainDumpId
      }))

      // If we archived the current brain dump, switch to another one
      if (get().currentBrainDumpId === id) {
        const remainingDumps = get().brainDumps
        if (remainingDumps.length > 0) {
          await get().switchBrainDump(remainingDumps[0].id)
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to archive brain dump'
      })
    }
  },

  updateViewport: (viewport: Viewport) => {
    set({ viewport })
  },

  saveViewport: async () => {
    const { currentBrainDumpId, viewport } = get()
    if (!currentBrainDumpId) return

    try {
      const { error } = await supabase
        .from('brain_dumps')
        .update({
          viewport_x: viewport.x,
          viewport_y: viewport.y,
          viewport_zoom: viewport.zoom
        })
        .eq('id', currentBrainDumpId)

      if (error) throw error

      // Update local state
      set(state => ({
        brainDumps: state.brainDumps.map(bd =>
          bd.id === currentBrainDumpId
            ? {
                ...bd,
                viewport_x: viewport.x,
                viewport_y: viewport.y,
                viewport_zoom: viewport.zoom
              }
            : bd
        )
      }))
    } catch (error) {
      console.error('Failed to save viewport:', error)
    }
  },

  // Selectors
  getCurrentBrainDump: () => {
    const { brainDumps, currentBrainDumpId } = get()
    return brainDumps.find(bd => bd.id === currentBrainDumpId) || null
  }
})