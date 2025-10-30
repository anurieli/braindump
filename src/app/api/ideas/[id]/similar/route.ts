import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// GET /api/ideas/[id]/similar - Find similar ideas using embeddings
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
    const limit = parseInt(searchParams.get('limit') || '5')
    const threshold = parseFloat(searchParams.get('threshold') || '0.7')

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      )
    }

    if (threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { error: 'Threshold must be between 0 and 1' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // First verify the idea exists and get its embedding
    const { data: sourceIdea, error: sourceError } = await supabase
      .from('ideas')
      .select('id, text, embedding, brain_dump_id')
      .eq('id', params.id)
      .single()

    if (sourceError || !sourceIdea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      )
    }

    if (!sourceIdea.embedding) {
      return NextResponse.json(
        { error: 'Source idea has no embedding for similarity search' },
        { status: 400 }
      )
    }

    // Find similar ideas using cosine similarity
    // Only search within the same brain dump and exclude the source idea
    const { data, error } = await supabase.rpc('match_ideas', {
      query_embedding: sourceIdea.embedding,
      match_threshold: threshold,
      match_count: limit + 1, // +1 to account for excluding source
      brain_dump_filter: sourceIdea.brain_dump_id
    })

    if (error) {
      console.error('Error finding similar ideas:', error)
      return NextResponse.json(
        { error: 'Failed to find similar ideas' },
        { status: 500 }
      )
    }

    // Filter out the source idea and limit results
    const similarIdeas = (data || [])
      .filter((idea: any) => idea.id !== params.id)
      .slice(0, limit)

    return NextResponse.json({
      data: similarIdeas,
      count: similarIdeas.length,
      source_idea: {
        id: sourceIdea.id,
        text: sourceIdea.text
      }
    })
  } catch (error) {
    console.error('Error finding similar ideas:', error)
    return NextResponse.json(
      { error: 'Failed to find similar ideas' },
      { status: 500 }
    )
  }
}