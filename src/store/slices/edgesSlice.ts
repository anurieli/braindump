import { StateCreator } from 'zustand'
import { Edge, EdgeDB, EdgeType } from '@/types'
import { supabase } from '@/lib/supabase'
import type { StoreState } from '../index'

export interface EdgesSlice {
  // State
  edges: Record<string, EdgeDB>
  edgeTypes: EdgeType[]
  isLoadingEdgeTypes: boolean

  // Actions
  loadEdges: (brainDumpId: string) => Promise<void>
  loadEdgeTypes: () => Promise<void>
  addEdge: (parentId: string, childId: string, type: string, note?: string) => Promise<string>
  updateEdge: (id: string, updates: { type?: string, note?: string }) => Promise<void>
  deleteEdge: (id: string) => Promise<void>
  createCustomEdgeType: (name: string) => Promise<string>
  validateEdge: (parentId: string, childId: string, edgeType?: string) => { valid: boolean, reason?: string }

  // Selectors
  getEdgesArray: () => EdgeDB[]
  getEdgesForIdea: (ideaId: string) => { parents: EdgeDB[], children: EdgeDB[] }
  getEdgesByType: (type: string) => EdgeDB[]
  wouldCreateCycle: (parentId: string, childId: string, edgeType?: string) => boolean
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
      const edgesRecord: Record<string, EdgeDB> = {}
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
    const validation = get().validateEdge(parentId, childId, type)
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid edge')
    }

    // Create temporary edge for optimistic update
    const tempId = `temp-${Date.now()}`
    const tempEdge: EdgeDB = {
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
    console.log('🗑️ Deleting edge:', id)
    const edge = get().edges[id]
    
    if (!edge) {
      console.error('❌ Edge not found in local state:', id)
      return
    }
    
    const brainDumpId = edge.brain_dump_id
    console.log('Edge data:', { id, brainDumpId, parentId: edge.parent_id, childId: edge.child_id })
    
    // Optimistic removal
    set(state => {
      const newEdges = { ...state.edges }
      delete newEdges[id]
      return { edges: newEdges }
    })

    try {
      console.log('Calling Supabase delete for edge:', id)
      const { error, data } = await supabase
        .from('edges')
        .delete()
        .eq('id', id)
        .select()

      if (error) {
        console.error('❌ Supabase error deleting edge:', error)
        throw error
      }

      console.log('✅ Edge deleted successfully:', data)

      // Refresh brain dump counts
      if (brainDumpId && get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(brainDumpId)
      }
    } catch (error) {
      console.error('❌ Failed to delete edge, restoring:', error)
      // Restore edge on error
      set(state => ({
        edges: { ...state.edges, [id]: edge }
      }))
      throw error
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

  validateEdge: (parentId: string, childId: string, edgeType?: string) => {
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

    // Get edge type behavior if provided
    const edgeTypes = get().edgeTypes
    const typeConfig = edgeType ? edgeTypes.find(et => et.name === edgeType) : null

    // Check for circular dependency only if edge type prevents cycles
    if (!typeConfig || typeConfig.prevents_cycles) {
      if (get().wouldCreateCycle(parentId, childId, edgeType)) {
        return { valid: false, reason: 'Would create circular dependency' }
      }
    }

    // For bidirectional edge types, check if reverse edge exists
    if (typeConfig?.allows_bidirectional) {
      const reverseEdge = Object.values(get().edges).find(
        edge => edge.parent_id === childId && edge.child_id === parentId && edge.type === edgeType
      )
      if (reverseEdge) {
        // This is fine for bidirectional relationships - we're creating A→B when B→A exists
        return { valid: true }
      }
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

  wouldCreateCycle: (parentId: string, childId: string, edgeType?: string) => {
    // Get edge type behavior
    const edgeTypes = get().edgeTypes
    const typeConfig = edgeType ? edgeTypes.find(et => et.name === edgeType) : null
    
    // If edge type allows bidirectional relationships, no cycle check needed
    if (typeConfig?.allows_bidirectional) {
      return false
    }
    
    // For hierarchical relationships, check cycles within the same edge type
    const edges = Object.values(get().edges)
    const relevantEdges = edgeType 
      ? edges.filter(edge => edge.type === edgeType)  // Only check same type
      : edges  // Check all edges if no type specified
    
    const visited = new Set<string>()
    
    const hasPath = (from: string, to: string): boolean => {
      if (from === to) return true
      if (visited.has(from)) return false
      
      visited.add(from)
      
      // Find all children of 'from' in relevant edges
      const children = relevantEdges
        .filter(edge => edge.parent_id === from)
        .map(edge => edge.child_id)
      
      return children.some(child => hasPath(child, to))
    }
    
    // Check if there's already a path from childId to parentId
    return hasPath(childId, parentId)
  }
})