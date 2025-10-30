import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/brain-dumps/[id]/ideas - Get all ideas in brain dump
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
    
    // First verify the brain dump exists
    const { data: brainDump, error: brainDumpError } = await supabase
      .from('brain_dumps')
      .select('id')
      .eq('id', params.id)
      .is('archived_at', null)
      .single()

    if (brainDumpError || !brainDump) {
      return NextResponse.json(
        { error: 'Brain dump not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('brain_dump_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching ideas:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ideas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      count: data.length
    })
  } catch (error) {
    console.error('Error fetching ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ideas' },
      { status: 500 }
    )
  }
}