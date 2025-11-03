import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/brain-dumps - List all brain dumps
export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Fetch brain dumps with counts using subqueries
    const { data, error } = await supabase
      .from('brain_dumps')
      .select(`
        *,
        ideas:ideas(count),
        edges:edges(count)
      `)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching brain dumps:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brain dumps' },
        { status: 500 }
      )
    }

    const brainDumpsWithCounts = data.map(bd => ({
      ...bd,
      idea_count: Array.isArray(bd.ideas) ? bd.ideas.length : 0,
      edge_count: Array.isArray(bd.edges) ? bd.edges.length : 0,
      ideas: undefined,
      edges: undefined
    }))

    return NextResponse.json({
      data: brainDumpsWithCounts,
      count: brainDumpsWithCounts.length
    })
  } catch (error) {
    console.error('Error fetching brain dumps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brain dumps' },
      { status: 500 }
    )
  }
}

// POST /api/brain-dumps - Create a new brain dump
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name = 'Untitled Dump', viewport_x = 0, viewport_y = 0, viewport_zoom = 1.0 } = body

    if (name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      )
    }

    if (viewport_zoom < 0.1 || viewport_zoom > 3.0) {
      return NextResponse.json(
        { error: 'Viewport zoom must be between 0.1 and 3.0' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('brain_dumps')
      .insert({
        name,
        viewport_x,
        viewport_y,
        viewport_zoom
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating brain dump:', error)
      return NextResponse.json(
        { error: 'Failed to create brain dump' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Brain dump created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating brain dump:', error)
    return NextResponse.json(
      { error: 'Failed to create brain dump' },
      { status: 500 }
    )
  }
}