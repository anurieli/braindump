import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/edge-types - List all available edge types
export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('edge_types')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching edge types:', error)
      return NextResponse.json(
        { error: 'Failed to fetch edge types' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      count: data.length
    })
  } catch (error) {
    console.error('Error fetching edge types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edge types' },
      { status: 500 }
    )
  }
}

// POST /api/edge-types - Create custom edge type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Edge type name is required and cannot be empty' },
        { status: 400 }
      )
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Edge type name must be 50 characters or less' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('edge_types')
      .insert({
        name: trimmedName,
        is_default: false
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Edge type with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating edge type:', error)
      return NextResponse.json(
        { error: 'Failed to create edge type' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Edge type created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating edge type:', error)
    return NextResponse.json(
      { error: 'Failed to create edge type' },
      { status: 500 }
    )
  }
}