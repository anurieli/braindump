import { StateCreator } from 'zustand'
import { BrainDump, Viewport } from '@/types'
import { supabase } from '@/lib/supabase'
import { getDemoSeedData } from '@/lib/demo-data'
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
  createDemoBrainDump: () => Promise<string>
  updateBrainDumpName: (id: string, name: string) => Promise<void>
  archiveBrainDump: (id: string) => Promise<void>
  updateViewport: (viewport: Viewport) => void
  saveViewport: () => Promise<void>
  updateBrainDumpTheme: (id: string, theme: string) => Promise<void>
  refreshBrainDumpCounts: (id: string) => Promise<void>

  // Selectors
  getCurrentBrainDump: () => BrainDump | null
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
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
      // Fetch brain dumps
      const { data, error } = await supabase
        .from('brain_dumps')
        .select('*')
        .is('archived_at', null)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Fetch counts for each brain dump
      const brainDumpsWithCounts = await Promise.all(
        (data || []).map(async (brainDump) => {
          // Get idea count
          const { count: ideaCount } = await supabase
            .from('ideas')
            .select('*', { count: 'exact', head: true })
            .eq('brain_dump_id', brainDump.id)
          
          // Get edge count
          const { count: edgeCount } = await supabase
            .from('edges')
            .select('*', { count: 'exact', head: true })
            .eq('brain_dump_id', brainDump.id)
          
          return {
            ...brainDump,
            idea_count: ideaCount || 0,
            edge_count: edgeCount || 0
          }
        })
      )

      set({ 
        brainDumps: brainDumpsWithCounts,
        isLoading: false 
      })

      const currentId = get().currentBrainDumpId

      if (!brainDumpsWithCounts || brainDumpsWithCounts.length === 0) {
        set({ currentBrainDumpId: null })
        return
      }

      const hasCurrent = currentId ? brainDumpsWithCounts.some(bd => bd.id === currentId) : false

      if (!currentId || !hasCurrent) {
        await get().switchBrainDump(brainDumpsWithCounts[0].id)
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

    // Switch to new brain dump and restore its viewport and theme
    set({
      currentBrainDumpId: id,
      viewport: {
        x: brainDump.viewport_x,
        y: brainDump.viewport_y,
        zoom: brainDump.viewport_zoom
      }
    })
    
    // Load theme from brain dump if available
    if (brainDump.theme) {
      get().setTheme(brainDump.theme)
    }
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

      // Fetch counts for the new brain dump
      const { count: ideaCount } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .eq('brain_dump_id', data.id)
      
      const { count: edgeCount } = await supabase
        .from('edges')
        .select('*', { count: 'exact', head: true })
        .eq('brain_dump_id', data.id)

      // Add to local state with counts
      set(state => ({
        brainDumps: [{ ...data, idea_count: ideaCount || 0, edge_count: edgeCount || 0 }, ...state.brainDumps],
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

  createDemoBrainDump: async () => {
    set({ isLoading: true, error: null })

    try {
      const { ideas, edges } = getDemoSeedData()

      const { data: brainDump, error: brainDumpError } = await supabase
        .from('brain_dumps')
        .insert({
          name: 'Demo Brain Dump',
          viewport_x: -150,
          viewport_y: -120,
          viewport_zoom: 0.85
        })
        .select()
        .single()

      if (brainDumpError) throw brainDumpError
      if (!brainDump) throw new Error('Failed to create demo brain dump')

      const brainDumpId = brainDump.id

      const ideaRows = ideas.map(template => ({
        id: generateId(),
        brain_dump_id: brainDumpId,
        text: template.text,
        position_x: template.x,
        position_y: template.y,
        width: template.width,
        height: template.height,
        state: 'ready'
      }))

      const ideaIdMap = ideas.reduce<Record<string, string>>((acc, template, index) => {
        acc[template.key] = ideaRows[index].id
        return acc
      }, {})

      if (ideaRows.length > 0) {
        const { error: ideasError } = await supabase
          .from('ideas')
          .insert(ideaRows)

        if (ideasError) throw ideasError
      }

      if (edges.length > 0) {
        const edgeRows = edges.map(template => ({
          id: generateId(),
          brain_dump_id: brainDumpId,
          parent_id: ideaIdMap[template.parentKey],
          child_id: ideaIdMap[template.childKey],
          type: template.type,
          note: template.note
        }))

        const { error: edgesError } = await supabase
          .from('edges')
          .insert(edgeRows)

        if (edgesError) throw edgesError
      }

      set(state => ({
        brainDumps: [{ ...brainDump, idea_count: ideaRows.length, edge_count: edges.length }, ...state.brainDumps],
        isLoading: false
      }))

      await get().switchBrainDump(brainDumpId)

      return brainDumpId
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create demo brain dump',
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

  updateBrainDumpTheme: async (id: string, theme: string) => {
    try {
      const { error } = await supabase
        .from('brain_dumps')
        .update({ theme })
        .eq('id', id)

      if (error) throw error

      // Update local state
      set(state => ({
        brainDumps: state.brainDumps.map(bd => 
          bd.id === id ? { ...bd, theme: theme as any } : bd
        )
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update brain dump theme'
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
  },

  refreshBrainDumpCounts: async (id: string) => {
    try {
      // Get idea count
      const { count: ideaCount } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .eq('brain_dump_id', id)
      
      // Get edge count
      const { count: edgeCount } = await supabase
        .from('edges')
        .select('*', { count: 'exact', head: true })
        .eq('brain_dump_id', id)
      
      // Update local state
      set(state => ({
        brainDumps: state.brainDumps.map(bd =>
          bd.id === id
            ? { ...bd, idea_count: ideaCount || 0, edge_count: edgeCount || 0 }
            : bd
        )
      }))
    } catch (error) {
      console.error('Failed to refresh brain dump counts:', error)
    }
  }
})