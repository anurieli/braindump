import { NextRequest, NextResponse } from 'next/server'
import { generateImage } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { prompt, size, quality, style } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    const result = await generateImage(prompt, {
      size,
      quality,
      style,
    })

    return NextResponse.json({
      success: true,
      imageUrl: result.data,
      model: result.model.id,
      cost: result.usage.cost,
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}




