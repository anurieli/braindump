import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/edges - List edges (filtered by brain_dump_id)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brainDumpId = searchParams.get('brain_dump_id')
    
    if (!brainDumpId) {
      return NextResponse.json(
        { error: 'brain_dump_id query parameter is required' },
        { status: 400 }
      )
    }

    if (!isValidUUID(brainDumpId)) {
      return NextResponse.json(
        { error: 'Invalid brain_dump_id format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First verify the brain dump exists
    const { data: brainDump, error: brainDumpError } = await supabase
      .from('brain_dumps')
      .select('id')
      .eq('id', brainDumpId)
      .is('archived_at', null)
      .single()

    if (brainDumpError || !brainDump) {
      return NextResponse.json(
        { error: 'Brain dump not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('edges')
      .select(`
        *,
        parent:parent_id(id, text),
        child:child_id(id, text)
      `)
      .eq('brain_dump_id', brainDumpId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching edges:', error)
      return NextResponse.json(
        { error: 'Failed to fetch edges' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      count: data.length
    })
  } catch (error) {
    console.error('Error fetching edges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edges' },
      { status: 500 }
    )
  }
}

// POST /api/edges - Create a new edge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brain_dump_id, parent_id, child_id, type, note } = body

    // Validation
    if (!brain_dump_id || !isValidUUID(brain_dump_id)) {
      return NextResponse.json(
        { error: 'Valid brain_dump_id is required' },
        { status: 400 }
      )
    }

    if (!parent_id || !isValidUUID(parent_id)) {
      return NextResponse.json(
        { error: 'Valid parent_id is required' },
        { status: 400 }
      )
    }

    if (!child_id || !isValidUUID(child_id)) {
      return NextResponse.json(
        { error: 'Valid child_id is required' },
        { status: 400 }
      )
    }

    if (parent_id === child_id) {
      return NextResponse.json(
        { error: 'parent_id and child_id cannot be the same (no self-references)' },
        { status: 400 }
      )
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Valid type string is required' },
        { status: 400 }
      )
    }

    const validEdgeTypes = ['related_to', 'prerequisite_for', 'inspired_by', 'blocks', 'similar_to', 'depends_on']
    if (!validEdgeTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid edge type. Must be one of: ' + validEdgeTypes.join(', ') },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify the brain dump exists
    const { data: brainDump, error: brainDumpError } = await supabase
      .from('brain_dumps')
      .select('id')
      .eq('id', brain_dump_id)
      .is('archived_at', null)
      .single()

    if (brainDumpError || !brainDump) {
      return NextResponse.json(
        { error: 'Brain dump not found' },
        { status: 404 }
      )
    }

    // Verify both parent and child ideas exist and belong to the brain dump
    const { data: parentIdea, error: parentError } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', parent_id)
      .eq('brain_dump_id', brain_dump_id)
      .single()

    if (parentError || !parentIdea) {
      return NextResponse.json(
        { error: 'Parent idea not found in the specified brain dump' },
        { status: 404 }
      )
    }

    const { data: childIdea, error: childError } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', child_id)
      .eq('brain_dump_id', brain_dump_id)
      .single()

    if (childError || !childIdea) {
      return NextResponse.json(
        { error: 'Child idea not found in the specified brain dump' },
        { status: 404 }
      )
    }

    // Edge type validation is done above, no need to query database

    // Check if this edge already exists
    const { data: existingEdge, error: existingError } = await supabase
      .from('edges')
      .select('id')
      .eq('parent_id', parent_id)
      .eq('child_id', child_id)
      .single()

    if (existingEdge) {
      return NextResponse.json(
        { error: 'Edge between these ideas already exists' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('edges')
      .insert({
        brain_dump_id,
        parent_id,
        child_id,
        type,
        note: note || null
      })
      .select(`
        *,
        parent:parent_id(id, text),
        child:child_id(id, text)
      `)
      .single()

    if (error) {
      console.error('Error creating edge:', error)
      return NextResponse.json(
        { error: 'Failed to create edge' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Edge created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating edge:', error)
    return NextResponse.json(
      { error: 'Failed to create edge' },
      { status: 500 }
    )
  }
}