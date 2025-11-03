import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Server-side only - API key stays secure
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }
  
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }
    
    const client = getOpenAIClient()
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    
    return NextResponse.json({ embedding: response.data[0].embedding })
  } catch (error) {
    console.error('Error generating embedding:', error)
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    )
  }
}

