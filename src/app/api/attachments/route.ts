import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// POST /api/attachments - Upload attachment
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ideaId = formData.get('idea_id') as string | null
    const type = formData.get('type') as string | null
    const url = formData.get('url') as string | null

    // Validation - either file upload or URL attachment
    if (!ideaId || !isValidUUID(ideaId)) {
      return NextResponse.json(
        { error: 'Valid idea_id is required' },
        { status: 400 }
      )
    }

    if (!file && !url) {
      return NextResponse.json(
        { error: 'Either file or url is required' },
        { status: 400 }
      )
    }

    if (file && url) {
      return NextResponse.json(
        { error: 'Cannot specify both file and url' },
        { status: 400 }
      )
    }

    const validTypes = ['image', 'pdf', 'url', 'file', 'text']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    
    // Verify the idea exists
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .select('id, brain_dump_id')
      .eq('id', ideaId)
      .single()

    if (ideaError || !idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      )
    }

    let attachmentUrl: string = ''
    let attachmentType: string = 'file'
    let filename: string | null = null
    let metadata: any = {}

    if (file) {
      // File upload to Supabase Storage
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { error: 'File size must be less than 10MB' },
          { status: 400 }
        )
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop()
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
      const storagePath = `attachments/${idea.brain_dump_id}/${ideaId}/${uniqueFilename}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload file' },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(storagePath)

      attachmentUrl = urlData.publicUrl
      filename = file.name
      attachmentType = type || determineFileType(file.type, file.name)
      
      metadata = {
        size: file.size,
        mimeType: file.type,
        originalName: file.name,
        storagePath: storagePath
      }
    } else if (url) {
      // URL attachment
      attachmentUrl = url
      attachmentType = type || 'url'
      filename = null
      
      metadata = {
        originalUrl: url
      }
    }

    // Create attachment record
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        idea_id: ideaId,
        type: attachmentType,
        url: attachmentUrl,
        filename: filename,
        metadata: metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating attachment:', error)
      
      // If we uploaded a file but failed to create the record, clean up
      if (file && metadata.storagePath) {
        await supabase.storage
          .from('attachments')
          .remove([metadata.storagePath])
      }
      
      return NextResponse.json(
        { error: 'Failed to create attachment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data,
      message: 'Attachment created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating attachment:', error)
    return NextResponse.json(
      { error: 'Failed to create attachment' },
      { status: 500 }
    )
  }
}

function determineFileType(mimeType: string, filename: string): string {
  // Image types
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  
  // PDF
  if (mimeType === 'application/pdf') {
    return 'pdf'
  }
  
  // Text files
  if (mimeType.startsWith('text/') || 
      filename.endsWith('.txt') || 
      filename.endsWith('.md') || 
      filename.endsWith('.rtf')) {
    return 'text'
  }
  
  // Default to generic file
  return 'file'
}