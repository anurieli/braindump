import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/ideas/[id] - Get a specific idea
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

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Idea not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching idea:', error)
      return NextResponse.json(
        { error: 'Failed to fetch idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data
    })
  } catch (error) {
    console.error('Error fetching idea:', error)
    return NextResponse.json(
      { error: 'Failed to fetch idea' },
      { status: 500 }
    )
  }
}

// PATCH /api/ideas/[id] - Update a specific idea
export async function PATCH(
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

    const body = await request.json()
    const { 
      text, 
      summary,
      position_x, 
      position_y, 
      width, 
      height,
      state,
      session_id,
      metadata
    } = body

    // Validation
    if (text !== undefined && (typeof text !== 'string' || text.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Text cannot be empty if provided' },
        { status: 400 }
      )
    }

    if (position_x !== undefined && typeof position_x !== 'number') {
      return NextResponse.json(
        { error: 'position_x must be a number' },
        { status: 400 }
      )
    }

    if (position_y !== undefined && typeof position_y !== 'number') {
      return NextResponse.json(
        { error: 'position_y must be a number' },
        { status: 400 }
      )
    }

    if (width !== undefined && (typeof width !== 'number' || width <= 0)) {
      return NextResponse.json(
        { error: 'width must be a positive number' },
        { status: 400 }
      )
    }

    if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
      return NextResponse.json(
        { error: 'height must be a positive number' },
        { status: 400 }
      )
    }

    if (state !== undefined && !['generating', 'ready', 'error'].includes(state)) {
      return NextResponse.json(
        { error: 'state must be one of: generating, ready, error' },
        { status: 400 }
      )
    }

    if (session_id !== undefined && session_id !== null && !isValidUUID(session_id)) {
      return NextResponse.json(
        { error: 'session_id must be a valid UUID if provided' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (text !== undefined) updateData.text = text.trim()
    if (summary !== undefined) updateData.summary = summary
    if (position_x !== undefined) updateData.position_x = position_x
    if (position_y !== undefined) updateData.position_y = position_y
    if (width !== undefined) updateData.width = width
    if (height !== undefined) updateData.height = height
    if (state !== undefined) updateData.state = state
    if (session_id !== undefined) updateData.session_id = session_id
    if (metadata !== undefined) updateData.metadata = metadata

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('ideas')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Idea not found' },
          { status: 404 }
        )
      }
      console.error('Error updating idea:', error)
      return NextResponse.json(
        { error: 'Failed to update idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Idea updated successfully'
    })
  } catch (error) {
    console.error('Error updating idea:', error)
    return NextResponse.json(
      { error: 'Failed to update idea' },
      { status: 500 }
    )
  }
}

// DELETE /api/ideas/[id] - Delete a specific idea
export async function DELETE(
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

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', params.id)
      .select('id, text')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Idea not found' },
          { status: 404 }
        )
      }
      console.error('Error deleting idea:', error)
      return NextResponse.json(
        { error: 'Failed to delete idea' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Idea deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting idea:', error)
    return NextResponse.json(
      { error: 'Failed to delete idea' },
      { status: 500 }
    )
  }
}