import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// POST /api/brain-dumps/[id]/duplicate - Duplicate brain dump
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid brain dump ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name } = body

    // Validation - name is optional, will generate default if not provided
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name must be a non-empty string if provided' },
        { status: 400 }
      )
    }

    if (name && name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be 100 characters or less' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First verify the source brain dump exists and is not archived
    const { data: sourceBrainDump, error: sourceError } = await supabase
      .from('brain_dumps')
      .select('*')
      .eq('id', params.id)
      .is('archived_at', null)
      .single()

    if (sourceError || !sourceBrainDump) {
      return NextResponse.json(
        { error: 'Source brain dump not found' },
        { status: 404 }
      )
    }

    // Generate name for duplicate if not provided
    const duplicateName = name?.trim() || `${sourceBrainDump.name} (Copy)`

    // Create the duplicate brain dump
    const { data: newBrainDump, error: brainDumpError } = await supabase
      .from('brain_dumps')
      .insert({
        name: duplicateName,
        viewport_x: sourceBrainDump.viewport_x || 0,
        viewport_y: sourceBrainDump.viewport_y || 0,
        viewport_zoom: sourceBrainDump.viewport_zoom || 1.0
      })
      .select()
      .single()

    if (brainDumpError) {
      console.error('Error creating duplicate brain dump:', brainDumpError)
      return NextResponse.json(
        { error: 'Failed to create duplicate brain dump' },
        { status: 500 }
      )
    }

    // Get all ideas from source brain dump
    const { data: sourceIdeas, error: ideasError } = await supabase
      .from('ideas')
      .select('*')
      .eq('brain_dump_id', params.id)

    if (ideasError) {
      console.error('Error fetching source ideas:', ideasError)
      // Clean up the created brain dump
      await supabase.from('brain_dumps').delete().eq('id', newBrainDump.id)
      return NextResponse.json(
        { error: 'Failed to fetch source ideas for duplication' },
        { status: 500 }
      )
    }

    let ideaMapping: Record<string, string> = {}

    // Duplicate all ideas if they exist
    if (sourceIdeas && sourceIdeas.length > 0) {
      const duplicateIdeas = sourceIdeas.map(idea => ({
        brain_dump_id: newBrainDump.id,
        text: idea.text,
        summary: idea.summary,
        x_position: idea.x_position,
        y_position: idea.y_position,
        embedding: idea.embedding,
        metadata: idea.metadata
      }))

      const { data: newIdeas, error: newIdeasError } = await supabase
        .from('ideas')
        .insert(duplicateIdeas)
        .select('id')

      if (newIdeasError) {
        console.error('Error duplicating ideas:', newIdeasError)
        // Clean up the created brain dump
        await supabase.from('brain_dumps').delete().eq('id', newBrainDump.id)
        return NextResponse.json(
          { error: 'Failed to duplicate ideas' },
          { status: 500 }
        )
      }

      // Create mapping from old idea IDs to new idea IDs
      sourceIdeas.forEach((sourceIdea, index) => {
        ideaMapping[sourceIdea.id] = newIdeas[index].id
      })

      // Get all edges from source brain dump
      const { data: sourceEdges, error: edgesError } = await supabase
        .from('edges')
        .select('*')
        .eq('brain_dump_id', params.id)

      if (edgesError) {
        console.error('Error fetching source edges:', edgesError)
        // Clean up created brain dump and ideas
        await supabase.from('brain_dumps').delete().eq('id', newBrainDump.id)
        return NextResponse.json(
          { error: 'Failed to fetch source edges for duplication' },
          { status: 500 }
        )
      }

      // Duplicate edges if they exist
      if (sourceEdges && sourceEdges.length > 0) {
        const duplicateEdges = sourceEdges.map(edge => ({
          brain_dump_id: newBrainDump.id,
          parent_id: ideaMapping[edge.parent_id],
          child_id: ideaMapping[edge.child_id],
          type: edge.type,
          note: edge.note
        }))

        const { error: newEdgesError } = await supabase
          .from('edges')
          .insert(duplicateEdges)

        if (newEdgesError) {
          console.error('Error duplicating edges:', newEdgesError)
          // Clean up created brain dump and ideas
          await supabase.from('brain_dumps').delete().eq('id', newBrainDump.id)
          return NextResponse.json(
            { error: 'Failed to duplicate edges' },
            { status: 500 }
          )
        }
      }
    }

    // Get the full duplicated brain dump with counts
    const { data: finalBrainDump, error: finalError } = await supabase
      .from('brain_dumps')
      .select(`
        *,
        ideas(count),
        edges(count)
      `)
      .eq('id', newBrainDump.id)
      .single()

    if (finalError) {
      console.error('Error fetching final brain dump:', finalError)
      return NextResponse.json(
        { error: 'Duplication completed but failed to fetch result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: finalBrainDump,
      message: 'Brain dump duplicated successfully',
      source_brain_dump: {
        id: sourceBrainDump.id,
        name: sourceBrainDump.name
      },
      duplicated_counts: {
        ideas: sourceIdeas?.length || 0,
        edges: 0 // Will be calculated from the actual duplicated edges
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating brain dump:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate brain dump' },
      { status: 500 }
    )
  }
}