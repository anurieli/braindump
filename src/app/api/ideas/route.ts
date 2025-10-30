import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { backgroundJobQueue } from '@/lib/background-jobs'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/ideas - List ideas (filtered by brain_dump_id)
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
      .from('ideas')
      .select('*')
      .eq('brain_dump_id', brainDumpId)
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

// POST /api/ideas - Create a new idea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      brain_dump_id, 
      text, 
      position_x, 
      position_y, 
      width = 200, 
      height = 100,
      state = 'generating',
      session_id,
      metadata = {}
    } = body

    // Validation
    if (!brain_dump_id || !isValidUUID(brain_dump_id)) {
      return NextResponse.json(
        { error: 'Valid brain_dump_id is required' },
        { status: 400 }
      )
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (typeof position_x !== 'number' || typeof position_y !== 'number') {
      return NextResponse.json(
        { error: 'position_x and position_y must be numbers' },
        { status: 400 }
      )
    }

    if (width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'width and height must be positive numbers' },
        { status: 400 }
      )
    }

    if (!['generating', 'ready', 'error'].includes(state)) {
      return NextResponse.json(
        { error: 'state must be one of: generating, ready, error' },
        { status: 400 }
      )
    }

    if (session_id && !isValidUUID(session_id)) {
      return NextResponse.json(
        { error: 'session_id must be a valid UUID if provided' },
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

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        brain_dump_id,
        text: text.trim(),
        position_x,
        position_y,
        width,
        height,
        state,
        session_id,
        metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating idea:', error)
      return NextResponse.json(
        { error: 'Failed to create idea' },
        { status: 500 }
      )
    }

    // Trigger background AI processing
    const trimmedText = text.trim()
    
    // Queue summarization if text is long enough (> 50 chars or > 2 lines)
    if (trimmedText.length > 50 || trimmedText.split('\n').length > 2) {
      await backgroundJobQueue.addJob('summarization', {
        ideaId: data.id,
        text: trimmedText
      })
    }

    // Queue embedding generation for all ideas
    await backgroundJobQueue.addJob('embedding', {
      ideaId: data.id,
      text: trimmedText
    })

    // Queue grammar cleaning if needed (basic check for common issues)
    if (trimmedText.includes('  ') || /[.!?][a-z]/.test(trimmedText)) {
      await backgroundJobQueue.addJob('grammar', {
        ideaId: data.id,
        text: trimmedText
      })
    }

    return NextResponse.json({
      data: data,
      message: 'Idea created successfully',
      background_jobs: {
        summarization: trimmedText.length > 50 || trimmedText.split('\n').length > 2,
        embedding: true,
        grammar: trimmedText.includes('  ') || /[.!?][a-z]/.test(trimmedText)
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating idea:', error)
    return NextResponse.json(
      { error: 'Failed to create idea' },
      { status: 500 }
    )
  }
}