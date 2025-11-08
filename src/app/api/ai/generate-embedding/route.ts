import { NextRequest, NextResponse } from 'next/server'
import { createEmbedding } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }
    
    const result = await createEmbedding(text)

    return NextResponse.json({
      embedding: result.data,
      model: result.model.id,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Error generating embedding:', error)
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    )
  }
}

