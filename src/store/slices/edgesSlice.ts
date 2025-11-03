import { StateCreator } from 'zustand'
import { Edge, EdgeType } from '@/types'
import { supabase } from '@/lib/supabase'
import type { StoreState } from '../index'

export interface EdgesSlice {
  // State
  edges: Record<string, Edge>
  edgeTypes: EdgeType[]
  isLoadingEdgeTypes: boolean

  // Actions
  loadEdges: (brainDumpId: string) => Promise<void>
  loadEdgeTypes: () => Promise<void>
  addEdge: (parentId: string, childId: string, type: string, note?: string) => Promise<string>
  updateEdge: (id: string, updates: { type?: string, note?: string }) => Promise<void>
  deleteEdge: (id: string) => Promise<void>
  createCustomEdgeType: (name: string) => Promise<string>
  validateEdge: (parentId: string, childId: string) => { valid: boolean, reason?: string }

  // Selectors
  getEdgesArray: () => Edge[]
  getEdgesForIdea: (ideaId: string) => { parents: Edge[], children: Edge[] }
  getEdgesByType: (type: string) => Edge[]
  wouldCreateCycle: (parentId: string, childId: string) => boolean
}

export const createEdgesSlice: StateCreator<
  StoreState,
  [],
  [],
  EdgesSlice
> = (set, get) => ({
  // Initial state
  edges: {},
  edgeTypes: [],
  isLoadingEdgeTypes: false,

  // Actions
  loadEdges: async (brainDumpId: string) => {
    try {
      const { data, error } = await supabase
        .from('edges')
        .select('*')
        .eq('brain_dump_id', brainDumpId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Convert array to record for easier lookups
      const edgesRecord: Record<string, Edge> = {}
      data?.forEach(edge => {
        edgesRecord[edge.id] = edge
      })

      set({ edges: edgesRecord })
    } catch (error) {
      console.error('Failed to load edges:', error)
    }
  },

  loadEdgeTypes: async () => {
    set({ isLoadingEdgeTypes: true })
    
    try {
      const { data, error } = await supabase
        .from('edge_types')
        .select('*')
        .order('is_default', { ascending: false }) // Default types first
        .order('name', { ascending: true })

      if (error) throw error

      set({ edgeTypes: data || [], isLoadingEdgeTypes: false })
    } catch (error) {
      console.error('Failed to load edge types:', error)
      set({ isLoadingEdgeTypes: false })
    }
  },

  addEdge: async (parentId: string, childId: string, type: string, note?: string) => {
    // Validate edge before creating
    const validation = get().validateEdge(parentId, childId)
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid edge')
    }

    // Create temporary edge for optimistic update
    const tempId = `temp-${Date.now()}`
    const tempEdge: Edge = {
      id: tempId,
      brain_dump_id: '', // Will be set from context
      parent_id: parentId,
      child_id: childId,
      type,
      note,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add to state immediately
    set(state => ({
      edges: { ...state.edges, [tempId]: tempEdge }
    }))

    try {
      // Get current brain dump ID from store
      const currentBrainDumpId = get().currentBrainDumpId
      if (!currentBrainDumpId) {
        throw new Error('No brain dump selected')
      }

      const { data, error } = await supabase
        .from('edges')
        .insert([{
          brain_dump_id: currentBrainDumpId,
          parent_id: parentId,
          child_id: childId,
          type,
          note
        }])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from insert')

      // Replace temp edge with real edge
      set(state => {
        const newEdges = { ...state.edges }
        delete newEdges[tempId]
        newEdges[data.id] = data
        return { edges: newEdges }
      })

      // Refresh brain dump counts
      if (get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(currentBrainDumpId)
      }

      return data.id
    } catch (error) {
      // Remove temp edge on error
      set(state => {
        const newEdges = { ...state.edges }
        delete newEdges[tempId]
        return { edges: newEdges }
      })
      throw error
    }
  },

  updateEdge: async (id: string, updates: { type?: string, note?: string }) => {
    // Optimistic update
    set(state => ({
      edges: {
        ...state.edges,
        [id]: { ...state.edges[id], ...updates, updated_at: new Date().toISOString() }
      }
    }))

    try {
      const { error } = await supabase
        .from('edges')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update edge:', error)
      // TODO: Revert optimistic update on error
    }
  },

  deleteEdge: async (id: string) => {
    const edge = get().edges[id]
    const brainDumpId = edge?.brain_dump_id
    
    // Optimistic removal
    set(state => {
      const newEdges = { ...state.edges }
      delete newEdges[id]
      return { edges: newEdges }
    })

    try {
      const { error } = await supabase
        .from('edges')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh brain dump counts
      if (brainDumpId && get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(brainDumpId)
      }
    } catch (error) {
      console.error('Failed to delete edge:', error)
      // TODO: Restore edge on error
    }
  },

  createCustomEdgeType: async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('edge_types')
        .insert([{ name, is_default: false }])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from insert')

      // Add to local state
      set(state => ({
        edgeTypes: [...state.edgeTypes, data]
      }))

      return data.id
    } catch (error) {
      console.error('Failed to create custom edge type:', error)
      throw error
    }
  },

  validateEdge: (parentId: string, childId: string) => {
    // Check for self-reference
    if (parentId === childId) {
      return { valid: false, reason: 'Cannot create edge to same idea' }
    }

    // Check for duplicate edge
    const existingEdge = Object.values(get().edges).find(
      edge => edge.parent_id === parentId && edge.child_id === childId
    )
    if (existingEdge) {
      return { valid: false, reason: 'Edge already exists between these ideas' }
    }

    // Check for circular dependency
    if (get().wouldCreateCycle(parentId, childId)) {
      return { valid: false, reason: 'Would create circular dependency' }
    }

    return { valid: true }
  },

  // Selectors
  getEdgesArray: () => {
    return Object.values(get().edges)
  },

  getEdgesForIdea: (ideaId: string) => {
    const allEdges = Object.values(get().edges)
    return {
      parents: allEdges.filter(edge => edge.child_id === ideaId),
      children: allEdges.filter(edge => edge.parent_id === ideaId)
    }
  },

  getEdgesByType: (type: string) => {
    return Object.values(get().edges).filter(edge => edge.type === type)
  },

  wouldCreateCycle: (parentId: string, childId: string) => {
    // Simple cycle detection using DFS
    const edges = Object.values(get().edges)
    const visited = new Set<string>()
    
    const hasPath = (from: string, to: string): boolean => {
      if (from === to) return true
      if (visited.has(from)) return false
      
      visited.add(from)
      
      // Find all children of 'from'
      const children = edges
        .filter(edge => edge.parent_id === from)
        .map(edge => edge.child_id)
      
      return children.some(child => hasPath(child, to))
    }
    
    // Check if there's already a path from childId to parentId
    return hasPath(childId, parentId)
  }
})