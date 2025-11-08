import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function extractMeta(html: string): Record<string, string> {
  const result: Record<string, string> = {}
  const metaTagRegex = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?>/gi
  let match
  while ((match = metaTagRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase()
    const val = match[2]
    result[key] = val
  }
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    result['title'] = titleMatch[1].trim()
  }
  // Robust favicon detection regardless of attribute order
  const linkTagRegex = /<link\b[^>]*>/gi
  let link
  while ((link = linkTagRegex.exec(html)) !== null) {
    const tag = link[0]
    const relMatch = tag.match(/rel=["']([^"']+)["']/i)
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i)
    if (relMatch && hrefMatch) {
      const rel = relMatch[1].toLowerCase()
      const href = hrefMatch[1]
      if (rel.includes('icon')) {
        result['favicon'] = result['favicon'] || href
      }
    }
  }
  return result
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

      // Enrich with link preview metadata (best-effort)
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'user-agent': 'Mozilla/5.0 (compatible; BrainDumpBot/1.0; +https://example.com/bot)',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        })
        if (res.ok) {
          const html = await res.text()
          const meta = extractMeta(html)
          const title = meta['og:title'] || meta['twitter:title'] || meta['title']
          const description = meta['og:description'] || meta['twitter:description'] || meta['description']
          let image = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image:src'] || meta['twitter:image']
          let favicon = meta['favicon']
          try {
            if (favicon) {
              const abs = new URL(favicon, url)
              favicon = abs.href
            }
            if (image) {
              const absImg = new URL(image, url)
              image = absImg.href
            }
          } catch {}
          metadata = {
            ...metadata,
            title,
            description,
            favicon,
            previewUrl: image,
            thumbnailUrl: image
          }
        }
      } catch (e) {
        // ignore preview errors
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