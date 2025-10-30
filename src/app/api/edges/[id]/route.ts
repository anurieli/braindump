import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// PATCH /api/edges/[id] - Update a specific edge (type, note)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid edge ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type, note } = body

    // Validation
    const validEdgeTypes = ['related_to', 'prerequisite_for', 'inspired_by', 'blocks', 'similar_to', 'depends_on']
    
    if (type !== undefined && (!type || typeof type !== 'string' || !validEdgeTypes.includes(type))) {
      return NextResponse.json(
        { error: 'Invalid edge type. Must be one of: ' + validEdgeTypes.join(', ') },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (type !== undefined) updateData.type = type
    if (note !== undefined) updateData.note = note

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('edges')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        parent:parent_id(id, text),
        child:child_id(id, text)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Edge not found' },
          { status: 404 }
        )
      }
      console.error('Error updating edge:', error)
      return NextResponse.json(
        { error: 'Failed to update edge' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Edge updated successfully'
    })
  } catch (error) {
    console.error('Error updating edge:', error)
    return NextResponse.json(
      { error: 'Failed to update edge' },
      { status: 500 }
    )
  }
}

// DELETE /api/edges/[id] - Delete a specific edge
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidUUID(params.id)) {
      return NextResponse.json(
        { error: 'Invalid edge ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('edges')
      .delete()
      .eq('id', params.id)
      .select(`
        id,
        type,
        parent:parent_id(id, text),
        child:child_id(id, text)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Edge not found' },
          { status: 404 }
        )
      }
      console.error('Error deleting edge:', error)
      return NextResponse.json(
        { error: 'Failed to delete edge' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Edge deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting edge:', error)
    return NextResponse.json(
      { error: 'Failed to delete edge' },
      { status: 500 }
    )
  }
}