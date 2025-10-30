import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/brain-dumps/[id] - Get a specific brain dump
export async function GET(
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

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('brain_dumps')
      .select(`
        *,
        ideas(count)
      `)
      .eq('id', params.id)
      .is('archived_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Brain dump not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching brain dump:', error)
      return NextResponse.json(
        { error: 'Failed to fetch brain dump' },
        { status: 500 }
      )
    }

    const brainDumpWithCount = {
      ...data,
      idea_count: data.ideas?.length || 0,
      ideas: undefined
    }

    return NextResponse.json({
      data: brainDumpWithCount
    })
  } catch (error) {
    console.error('Error fetching brain dump:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brain dump' },
      { status: 500 }
    )
  }
}

// PATCH /api/brain-dumps/[id] - Update a specific brain dump
export async function PATCH(
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
    const { name, viewport_x, viewport_y, viewport_zoom } = body

    if (name !== undefined && (name.length < 1 || name.length > 100)) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      )
    }

    if (viewport_zoom !== undefined && (viewport_zoom < 0.1 || viewport_zoom > 3.0)) {
      return NextResponse.json(
        { error: 'Viewport zoom must be between 0.1 and 3.0' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (viewport_x !== undefined) updateData.viewport_x = viewport_x
    if (viewport_y !== undefined) updateData.viewport_y = viewport_y
    if (viewport_zoom !== undefined) updateData.viewport_zoom = viewport_zoom

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('brain_dumps')
      .update(updateData)
      .eq('id', params.id)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Brain dump not found' },
          { status: 404 }
        )
      }
      console.error('Error updating brain dump:', error)
      return NextResponse.json(
        { error: 'Failed to update brain dump' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Brain dump updated successfully'
    })
  } catch (error) {
    console.error('Error updating brain dump:', error)
    return NextResponse.json(
      { error: 'Failed to update brain dump' },
      { status: 500 }
    )
  }
}

// DELETE /api/brain-dumps/[id] - Delete a specific brain dump (soft delete)
export async function DELETE(
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

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('brain_dumps')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', params.id)
      .is('archived_at', null)
      .select('id, name')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Brain dump not found' },
          { status: 404 }
        )
      }
      console.error('Error archiving brain dump:', error)
      return NextResponse.json(
        { error: 'Failed to archive brain dump' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Brain dump archived successfully'
    })
  } catch (error) {
    console.error('Error archiving brain dump:', error)
    return NextResponse.json(
      { error: 'Failed to archive brain dump' },
      { status: 500 }
    )
  }
}