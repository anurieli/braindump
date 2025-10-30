import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/ideas/[id]/parent - Get parent idea via edges
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid idea ID format' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const edgeType = searchParams.get('edge_type')

    const supabase = createServerClient()
    
    // First verify the child idea exists
    const { data: childIdea, error: childError } = await supabase
      .from('ideas')
      .select('id, text, brain_dump_id')
      .eq('id', params.id)
      .single()

    if (childError || !childIdea) {
      return NextResponse.json(
        { error: 'Child idea not found' },
        { status: 404 }
      )
    }

    // Build the query to get parents via edges
    let query = supabase
      .from('edges')
      .select(`
        id,
        type,
        note,
        created_at,
        parent:parent_id(
          id,
          text,
          created_at,
          updated_at,
          x_position,
          y_position
        )
      `)
      .eq('child_id', params.id)
      .order('created_at', { ascending: false })

    // Filter by edge type if specified
    if (edgeType) {
      const validEdgeTypes = ['related_to', 'prerequisite_for', 'inspired_by', 'blocks', 'similar_to', 'depends_on']
      if (!validEdgeTypes.includes(edgeType)) {
        return NextResponse.json(
          { error: 'Invalid edge type. Must be one of: ' + validEdgeTypes.join(', ') },
          { status: 400 }
        )
      }
      query = query.eq('type', edgeType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching parent ideas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch parent ideas' },
        { status: 500 }
      )
    }

    // Transform the data to focus on parents while preserving edge info
    const parents = (data || []).map(edge => ({
      ...edge.parent,
      edge: {
        id: edge.id,
        type: edge.type,
        note: edge.note,
        created_at: edge.created_at
      }
    }))

    return NextResponse.json({
      data: parents,
      count: parents.length,
      child_idea: {
        id: childIdea.id,
        text: childIdea.text
      },
      edge_type_filter: edgeType || null
    })
  } catch (error) {
    console.error('Error fetching parent ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parent ideas' },
      { status: 500 }
    )
  }
}