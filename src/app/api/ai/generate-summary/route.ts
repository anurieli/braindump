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
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries of text. Keep summaries under 100 words and capture the main ideas.',
        },
        {
          role: 'user',
          content: `Please summarize this text: ${text}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    })
    
    return NextResponse.json({ 
      summary: response.choices[0].message.content || text 
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

