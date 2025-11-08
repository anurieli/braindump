import { StateCreator } from 'zustand'
import { IdeaDB } from '@/types'

// Alias for easier use in the store
type Idea = IdeaDB
import { supabase } from '@/lib/supabase'
import { generateEmbedding, generateSummary } from '@/lib/openai'
import { uploadFile, validateFile } from '@/lib/file-upload'
import { positionDebouncer } from '@/lib/debounce'
import type { StoreState } from '../index'

export interface IdeasSlice {
  // State
  ideas: Record<string, Idea>
  selectedIdeaId: string | null
  isProcessing: Record<string, boolean>
  lastPlacedIdeaPosition: { x: number, y: number } | null

  // Actions
  loadIdeas: (brainDumpId: string) => Promise<void>
  addIdea: (text: string, position: { x: number, y: number }) => Promise<string>
  addAttachmentIdea: (file: File, position: { x: number, y: number }, description?: string) => Promise<string>
  updateIdeaText: (id: string, text: string) => Promise<void>
  updateIdeaPosition: (id: string, position: { x: number, y: number }) => void
  updateIdeaDimensions: (id: string, dimensions: { width: number, height: number }) => void
  deleteIdea: (id: string) => Promise<void>
  selectIdea: (id: string | null) => void
  processIdeaAI: (id: string) => Promise<void>

  // Selectors
  getIdeasArray: () => Idea[]
  getIdeasForBrainDump: (brainDumpId: string) => Idea[]
  getVisibleIdeas: (viewport: { x: number, y: number, zoom: number }, canvasSize: { width: number, height: number }) => Idea[]
  getSelectedIdea: () => Idea | null
}

export const createIdeasSlice: StateCreator<
  StoreState,
  [],
  [],
  IdeasSlice
> = (set, get) => ({
  // Initial state
  ideas: {},
  selectedIdeaId: null,
  isProcessing: {},
  lastPlacedIdeaPosition: null,

  // Actions
  loadIdeas: async (brainDumpId: string) => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('brain_dump_id', brainDumpId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Convert array to record for easier lookups
      const ideasRecord: Record<string, Idea> = {}
      data?.forEach(idea => {
        ideasRecord[idea.id] = idea
      })

      set({ ideas: ideasRecord })
    } catch (error) {
      console.error('Failed to load ideas:', error)
    }
  },

  addIdea: async (text: string, position: { x: number, y: number }) => {
    try {
      // Get current brain dump ID from store
      const currentBrainDumpId = get().currentBrainDumpId
      if (!currentBrainDumpId) {
        throw new Error('No brain dump selected')
      }

      // Determine state based on text length
      // Short text (< 50 chars) goes directly to 'ready', longer text needs AI processing
      const needsAI = text.length >= 50
      const initialState = needsAI ? 'generating' : 'ready'

      // Insert into database with correct initial state
      const { data, error } = await supabase
        .from('ideas')
        .insert([{
          brain_dump_id: currentBrainDumpId,
          text: text,
          position_x: position.x,
          position_y: position.y,
          width: 200,
          height: 100,
          type: 'text',
          state: initialState
        }])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from insert')

      // Add real idea to state immediately
      set(state => ({
        ideas: { 
          ...state.ideas, 
          [data.id]: data 
        },
        isProcessing: { 
          ...state.isProcessing, 
          [data.id]: needsAI 
        },
        lastPlacedIdeaPosition: { x: data.position_x, y: data.position_y }
      }))

      // Only process AI enhancements if text is long enough
      if (needsAI) {
        get().processIdeaAI(data.id)
      }

      // Refresh brain dump counts
      if (get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(currentBrainDumpId)
      }

      return data.id
    } catch (error) {
      console.error('Failed to add idea:', error)
      throw error
    }
  },

  addAttachmentIdea: async (file: File, position: { x: number, y: number }, description?: string) => {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimistic update - create temporary attachment idea
    const tempId = `temp-${Date.now()}`;
    const defaultDescription = description || `📎 ${file.name}`;
    const tempIdea: Idea = {
      id: tempId,
      brain_dump_id: '',
      text: defaultDescription,
      position_x: position.x,
      position_y: position.y,
      width: 200,
      height: 200, // Square for attachments
      type: 'attachment',
      state: 'generating',
      metadata: {
        uploading: true,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add to state immediately
    set(state => ({
      ideas: { ...state.ideas, [tempId]: tempIdea },
      isProcessing: { ...state.isProcessing, [tempId]: true },
      lastPlacedIdeaPosition: position
    }));

    try {
      // Get current brain dump ID from store
      const currentBrainDumpId = get().currentBrainDumpId;
      if (!currentBrainDumpId) {
        throw new Error('No brain dump selected');
      }

      // Upload file to storage
      const uploadResult = await uploadFile(file);

      // Insert attachment idea into database
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .insert([{
          brain_dump_id: currentBrainDumpId,
          text: defaultDescription,
          position_x: position.x,
          position_y: position.y,
          width: 200,
          height: 200,
          type: 'attachment',
          state: 'generating',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            ...uploadResult.metadata
          }
        }])
        .select()
        .single();

      if (ideaError) throw ideaError;
      if (!ideaData) throw new Error('No idea data returned from insert');

      // Insert attachment record
      const { error: attachmentError } = await supabase
        .from('attachments')
        .insert([{
          idea_id: ideaData.id,
          type: validation.type || 'file',
          url: uploadResult.url,
          filename: uploadResult.filename,
          metadata: uploadResult.metadata
        }]);

      if (attachmentError) throw attachmentError;

      // Replace temp idea with real idea
      set(state => {
        const newIdeas = { ...state.ideas };
        delete newIdeas[tempId];
        newIdeas[ideaData.id] = {
          ...ideaData,
          state: 'ready'
        };

        const newProcessing = { ...state.isProcessing };
        delete newProcessing[tempId];
        newProcessing[ideaData.id] = false;

        return {
          ideas: newIdeas,
          isProcessing: newProcessing,
          lastPlacedIdeaPosition: { x: ideaData.position_x, y: ideaData.position_y }
        };
      });

      // Refresh brain dump counts
      if (get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(currentBrainDumpId);
      }

      return ideaData.id;
    } catch (error) {
      // Remove temp idea on error
      set(state => {
        const newIdeas = { ...state.ideas };
        delete newIdeas[tempId];
        const newProcessing = { ...state.isProcessing };
        delete newProcessing[tempId];
        return { ideas: newIdeas, isProcessing: newProcessing };
      });
      throw error;
    }
  },

  updateIdeaText: async (id: string, text: string) => {
    // Optimistic update
    set(state => ({
      ideas: {
        ...state.ideas,
        [id]: { ...state.ideas[id], text, state: 'generating' }
      },
      isProcessing: { ...state.isProcessing, [id]: true }
    }))

    try {
      const { error } = await supabase
        .from('ideas')
        .update({ text: text, state: 'generating' })
        .eq('id', id)

      if (error) throw error

      // Process AI enhancements
      get().processIdeaAI(id)
    } catch (error) {
      console.error('Failed to update idea text:', error)
    }
  },

  updateIdeaPosition: (id: string, position: { x: number, y: number }) => {
    // Immediate local update for smooth dragging
    set(state => ({
      ideas: {
        ...state.ideas,
        [id]: { ...state.ideas[id], position_x: position.x, position_y: position.y }
      }
    }))

    // Debounced database update
    positionDebouncer.add(id, position.x, position.y)
  },

  updateIdeaDimensions: (id: string, dimensions: { width: number, height: number }) => {
    set(state => ({
      ideas: {
        ...state.ideas,
        [id]: { ...state.ideas[id], width: dimensions.width, height: dimensions.height }
      }
    }))
  },

  deleteIdea: async (id: string) => {
    const idea = get().ideas[id]
    const brainDumpId = idea?.brain_dump_id
    
    // Find all edges connected to this idea (they will be CASCADE deleted in DB)
    const connectedEdgeIds = Object.keys(get().edges).filter(edgeId => {
      const edge = get().edges[edgeId]
      return edge.sourceId === id || edge.targetId === id
    })
    
    console.log(`🗑️ Deleting idea ${id} and ${connectedEdgeIds.length} connected edges`)
    
    // Optimistic removal - remove idea AND its connected edges from local state
    set(state => {
      const newIdeas = { ...state.ideas }
      delete newIdeas[id]
      
      const newEdges = { ...state.edges }
      connectedEdgeIds.forEach(edgeId => {
        delete newEdges[edgeId]
      })
      
      return { ideas: newIdeas, edges: newEdges }
    })

    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Refresh brain dump counts
      if (brainDumpId && get().refreshBrainDumpCounts) {
        get().refreshBrainDumpCounts(brainDumpId)
      }
    } catch (error) {
      console.error('Failed to delete idea:', error)
      // TODO: Restore idea AND edges on error
    }
  },

  selectIdea: (id: string | null) => {
    set({ selectedIdeaId: id })
  },

  processIdeaAI: async (id: string) => {
    const idea = get().ideas[id]
    if (!idea) return

    try {
      const updates: Partial<Idea> = {}

      // Generate summary if text is long enough
      if (idea.text && idea.text.length > 50) {
        const summary = await generateSummary(idea.text)
        updates.summary = summary
      }

      // Generate embedding
      const embedding = await generateEmbedding(idea.text)
      updates.embedding = embedding
      updates.state = 'ready'

      // Update database
      const { error } = await supabase
        .from('ideas')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Update local state
      set(state => ({
        ideas: {
          ...state.ideas,
          [id]: { ...state.ideas[id], ...updates }
        },
        isProcessing: { ...state.isProcessing, [id]: false }
      }))
    } catch (error) {
      console.error('Failed to process idea AI:', error)
      
      // Mark as error state
      set(state => ({
        ideas: {
          ...state.ideas,
          [id]: { ...state.ideas[id], state: 'error' }
        },
        isProcessing: { ...state.isProcessing, [id]: false }
      }))
    }
  },

  // Selectors
  getIdeasArray: () => {
    return Object.values(get().ideas)
  },

  getIdeasForBrainDump: (brainDumpId: string) => {
    return Object.values(get().ideas).filter(idea => idea.brain_dump_id === brainDumpId)
  },

  getVisibleIdeas: (viewport, canvasSize) => {
    const buffer = 500 // Render ideas 500px outside viewport for smooth scrolling
    const { x, y, zoom } = viewport
    const { width, height } = canvasSize

    // Convert screen viewport to world coordinates
    // In Konva, negative stage position means we've moved right/down in world space
    const worldLeft = (-x - buffer) / zoom
    const worldTop = (-y - buffer) / zoom
    const worldRight = (-x + width + buffer) / zoom
    const worldBottom = (-y + height + buffer) / zoom

    const allIdeas = Object.values(get().ideas)
    const visibleIdeas = allIdeas.filter(idea => {
      const ideaRight = idea.position_x + (idea.width || 200)
      const ideaBottom = idea.position_y + (idea.height || 100)

      const isVisible = !(
        idea.position_x > worldRight ||
        ideaRight < worldLeft ||
        idea.position_y > worldBottom ||
        ideaBottom < worldTop
      )

      return isVisible
    })

    // console.log('🔍 Viewport culling:', {
    //   viewport: { x, y, zoom },
    //   canvasSize,
    //   worldBounds: { worldLeft, worldTop, worldRight, worldBottom },
    //   totalIdeas: allIdeas.length,
    //   visibleIdeas: visibleIdeas.length,
    //   ideas: allIdeas.map(i => ({
    //     id: i.id,
    //     pos: { x: i.position_x, y: i.position_y },
    //     visible: visibleIdeas.includes(i)
    //   }))
    // })

    return visibleIdeas
  },

  getSelectedIdea: () => {
    const { selectedIdeaId, ideas } = get()
    return selectedIdeaId ? ideas[selectedIdeaId] || null : null
  }
})