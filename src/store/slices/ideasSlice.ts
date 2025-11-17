import { StateCreator } from 'zustand'
import { IdeaDB, AttachmentMetadata } from '@/types'

// Alias for easier use in the store
type Idea = IdeaDB
import { supabase } from '@/lib/supabase'
import { generateEmbedding, generateSummary } from '@/lib/openai'
import { uploadFile, validateFile } from '@/lib/file-upload'
import { positionDebouncer } from '@/lib/debounce'
import type { StoreState } from '../index'
import { undoRedoManager } from '../index'

export interface IdeasSlice {
  // State
  ideas: Record<string, Idea>
  selectedIdeaId: string | null
  isProcessing: Record<string, boolean>
  lastPlacedIdeaPosition: { x: number, y: number } | null

  // Actions
  loadIdeas: (brainDumpId: string) => Promise<void>
  addIdea: (text: string, position: { x: number, y: number }) => Promise<string>
  addIdeaWithEdge: (text: string, position: { x: number, y: number }, parentId?: string, edgeType?: string, edgeNote?: string) => Promise<{ ideaId: string, edgeId?: string }>
  addAttachmentIdea: (file: File, position: { x: number, y: number }, description?: string) => Promise<string>
  addUrlAttachmentIdea: (url: string, position: { x: number, y: number }) => Promise<string>
  updateIdeaText: (id: string, text: string, options?: { skipAI?: boolean }) => Promise<void>
  updateIdeaPosition: (id: string, position: { x: number, y: number }) => void
  updateIdeaDimensions: (id: string, dimensions: { width: number, height: number }) => void
  updateAttachmentMetadata: (id: string, metadata: Partial<AttachmentMetadata>) => Promise<void>
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
      // Short text (< 60 chars) goes directly to 'ready', longer text needs AI processing
      const needsAI = text.length >= 60
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

      // Save history immediately for undo functionality
      console.log('💾 addIdea: Saving history immediately for idea:', data.id)
      undoRedoManager.saveState({
        ideas: get().ideas,
        edges: get().edges
      }, true)

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

  addIdeaWithEdge: async (text: string, position: { x: number, y: number }, parentId?: string, edgeType = 'relates-to', edgeNote?: string) => {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Idea text cannot be empty')
    }

    if (text.length > 5000) {
      throw new Error('Idea text too long (max 5000 characters)')
    }

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      throw new Error('Invalid position coordinates')
    }

    if (parentId && typeof parentId !== 'string') {
      throw new Error('Invalid parent ID format')
    }

    if (edgeType && typeof edgeType !== 'string') {
      throw new Error('Invalid edge type format')
    }

    try {
      // Get current brain dump ID from store
      const currentBrainDumpId = get().currentBrainDumpId
      if (!currentBrainDumpId) {
        throw new Error('No brain dump selected')
      }

      // Validate parent relationship if provided
      if (parentId) {
        if (!get().ideas[parentId]) {
          throw new Error(`Parent idea ${parentId} does not exist`)
        }

        // Check if parent idea is in same brain dump
        const parentIdea = get().ideas[parentId]
        if (parentIdea.brain_dump_id !== currentBrainDumpId) {
          throw new Error('Cannot create edge to idea in different brain dump')
        }

        // Validate edge before proceeding
        const edgeValidation = get().validateEdge(parentId, 'temp-will-be-replaced', edgeType)
        if (!edgeValidation.valid && !edgeValidation.reason?.includes('Edge already exists')) {
          throw new Error(`Invalid edge relationship: ${edgeValidation.reason}`)
        }

        // Validate edge type exists
        const edgeTypes = get().edgeTypes
        const typeExists = edgeTypes.some(et => et.name === edgeType)
        if (!typeExists) {
          console.warn(`Edge type '${edgeType}' not found in available types, using default`)
          edgeType = 'relates-to'
        }
      }

      // Determine state based on text length
      const needsAI = text.length >= 60
      const initialState = needsAI ? 'generating' : 'ready'

      let ideaId: string
      let edgeId: string | undefined
      let ideaCreated = false
      let edgeCreated = false

      try {
        // Step 1: Create the idea first
        const { data: ideaData, error: ideaError } = await supabase
          .from('ideas')
          .insert([{
            brain_dump_id: currentBrainDumpId,
            text: text.trim(),
            position_x: Math.round(position.x),
            position_y: Math.round(position.y),
            width: 200,
            height: 100,
            type: 'text',
            state: initialState
          }])
          .select()
          .single()

        if (ideaError) {
          console.error('Database error creating idea:', ideaError)
          throw new Error(`Failed to create idea: ${ideaError.message || ideaError}`)
        }
        
        if (!ideaData) {
          throw new Error('No idea data returned from insert')
        }

        ideaId = ideaData.id
        ideaCreated = true

        // Step 2: Create edge if parent is specified
        if (parentId) {
          // Re-validate now that we have the actual child ID
          const finalEdgeValidation = get().validateEdge(parentId, ideaId, edgeType)
          if (!finalEdgeValidation.valid) {
            throw new Error(`Failed to create edge: ${finalEdgeValidation.reason}`)
          }

          const { data: edgeData, error: edgeError } = await supabase
            .from('edges')
            .insert([{
              brain_dump_id: currentBrainDumpId,
              parent_id: parentId,
              child_id: ideaId,
              type: edgeType,
              note: edgeNote?.trim() || null
            }])
            .select()
            .single()

          if (edgeError) {
            console.error('Database error creating edge:', edgeError)
            throw new Error(`Failed to create edge: ${edgeError.message || edgeError}`)
          }

          if (!edgeData) {
            throw new Error('No edge data returned from insert')
          }

          edgeId = edgeData.id
          edgeCreated = true

          // Update edges state with the new edge
          set(state => ({
            edges: {
              ...state.edges,
              [edgeData.id]: edgeData
            }
          }))
        }

        // Step 3: Add idea to state
        set(state => ({
          ideas: {
            ...state.ideas,
            [ideaData.id]: ideaData
          },
          isProcessing: {
            ...state.isProcessing,
            [ideaData.id]: needsAI
          },
          lastPlacedIdeaPosition: { x: ideaData.position_x, y: ideaData.position_y }
        }))

        // Step 4: Save history immediately for atomic undo functionality
        console.log('💾 addIdeaWithEdge: Saving history immediately for atomic operation:', { ideaId, edgeId })
        undoRedoManager.saveState({
          ideas: get().ideas,
          edges: get().edges
        }, true)

        // Step 5: Process AI enhancements if needed
        if (needsAI) {
          // Run AI processing in background, don't let it fail the atomic operation
          try {
            get().processIdeaAI(ideaData.id)
          } catch (aiError) {
            console.warn('AI processing failed for idea', ideaId, ':', aiError)
          }
        }

        // Step 6: Refresh brain dump counts
        if (get().refreshBrainDumpCounts) {
          try {
            get().refreshBrainDumpCounts(currentBrainDumpId)
          } catch (countError) {
            console.warn('Failed to refresh brain dump counts:', countError)
          }
        }

        return { ideaId: ideaData.id, edgeId }
      } catch (operationError) {
        // Cleanup on failure - rollback database changes
        console.error('Atomic operation failed, performing cleanup:', operationError)

        if (edgeCreated && edgeId) {
          try {
            await supabase.from('edges').delete().eq('id', edgeId)
            console.log('Cleaned up edge:', edgeId)
          } catch (cleanupError) {
            console.error('Failed to cleanup edge during rollback:', cleanupError)
          }
        }

        if (ideaCreated && ideaId) {
          try {
            await supabase.from('ideas').delete().eq('id', ideaId)
            console.log('Cleaned up idea:', ideaId)
          } catch (cleanupError) {
            console.error('Failed to cleanup idea during rollback:', cleanupError)
          }
        }

        throw operationError
      }
    } catch (error) {
      console.error('Failed to add idea with edge:', error)
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

  addUrlAttachmentIdea: async (url: string, position: { x: number, y: number }) => {
    // Create temporary URL attachment idea
    const tempId = `temp-url-${Date.now()}`;
    const defaultDescription = `🌐 ${url}`;
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
        url: url
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

      // Fetch link preview
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch link preview');
      }
      const linkPreview = await response.json();

      // Prepare metadata with link preview data
      const metadata = {
        url: url,
        linkPreview: {
          title: linkPreview.title || 'Untitled',
          description: linkPreview.description || '',
          image: linkPreview.image || '',
          favicon: linkPreview.favicon || ''
        }
      };

      // Insert URL attachment idea into database
      const { data: ideaData, error: ideaError } = await supabase
        .from('ideas')
        .insert([{
          brain_dump_id: currentBrainDumpId,
          text: linkPreview.title || url,
          position_x: position.x,
          position_y: position.y,
          width: 200,
          height: 200,
          type: 'attachment',
          state: 'ready',
          metadata: metadata
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
          type: 'url',
          url: url,
          filename: linkPreview.title || url,
          metadata: metadata
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

  updateIdeaText: async (id: string, text: string, options: { skipAI?: boolean } = {}) => {
    console.log('✏️ updateIdeaText called for', id, 'with text length:', text.length)
    const { skipAI = false } = options

    const currentState = get()
    if (!currentState.ideas[id]) {
      console.warn('Attempted to update text for non-existent idea:', id)
      return
    }

    if (currentState.ideas[id].text === text) {
      return
    }

    console.log('💾 updateIdeaText: Saving history immediately before text update')
    undoRedoManager.saveState({
      ideas: currentState.ideas,
      edges: currentState.edges
    }, true)

    // Optimistic update
    set(state => ({
      ideas: {
        ...state.ideas,
        [id]: {
          ...state.ideas[id],
          text,
          summary: skipAI ? null : state.ideas[id].summary,
          state: skipAI ? 'ready' : 'generating'
        }
      },
      isProcessing: {
        ...state.isProcessing,
        [id]: skipAI ? false : true
      }
    }))

    try {
      const updatePayload: Partial<Idea> = {
        text,
        state: skipAI ? 'ready' : 'generating',
        ...(skipAI ? { summary: null } : {})
      }

      const { error } = await supabase
        .from('ideas')
        .update(updatePayload)
        .eq('id', id)

      if (error) throw error

      if (!skipAI) {
        // Process AI enhancements
        get().processIdeaAI(id)
      }
    } catch (error) {
      console.error('Failed to update idea text:', error)
    }
  },

  updateIdeaPosition: (id: string, position: { x: number, y: number }) => {
    console.log('📍 updateIdeaPosition called for', id, 'to', position)

    const currentState = get()
    if (!currentState.ideas[id]) {
      console.warn('Attempted to update position for non-existent idea:', id)
      return
    }

    // Save history immediately before position update
    console.log('💾 updateIdeaPosition: Saving history immediately before position update')
    undoRedoManager.saveState({
      ideas: currentState.ideas,
      edges: currentState.edges
    }, true)

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

  updateAttachmentMetadata: async (id: string, metadataUpdate: Partial<AttachmentMetadata>) => {
    const currentState = get()
    const idea = currentState.ideas[id]
    
    if (!idea || idea.type !== 'attachment') {
      console.warn('Cannot update metadata for non-attachment idea:', id)
      return
    }

    // Update local state immediately (optimistic update)
    const newMetadata = { ...(idea.metadata || {}), ...metadataUpdate }
    set(state => ({
      ideas: {
        ...state.ideas,
        [id]: { ...state.ideas[id], metadata: newMetadata }
      }
    }))

    try {
      // Update database
      const { error } = await supabase
        .from('ideas')
        .update({ metadata: newMetadata })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update attachment metadata:', error)
      // Revert optimistic update on error
      set(state => ({
        ideas: {
          ...state.ideas,
          [id]: { ...state.ideas[id], metadata: idea.metadata }
        }
      }))
    }
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
      if (idea.text && idea.text.length > 60) {
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