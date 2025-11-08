import { NextRequest, NextResponse } from 'next/server'
import { summarizeText } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }
    
    const result = await summarizeText(text)

    return NextResponse.json({
      summary: result.data || text,
      model: result.model.id,
      usage: result.usage,
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

