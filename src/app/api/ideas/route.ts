import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { backgroundJobQueue } from '@/lib/background-jobs'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function extractUrls(text: string): string[] {
  if (typeof text !== 'string' || !text) return []
  // Basic URL regex for http/https
  const urlRegex = /\bhttps?:\/\/[^\s<>()]+/gi
  const urls = text.match(urlRegex) || []
  // Deduplicate and trim punctuation
  const cleaned = urls
    .map(u => u.replace(/[),.;]+$/g, ''))
    .filter(Boolean)
  return Array.from(new Set(cleaned))
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

    // Extract URLs from the text and create URL attachments (best-effort, non-blocking errors)
    const foundUrls = extractUrls(trimmedText)
    if (foundUrls.length > 0) {
      for (const url of foundUrls) {
        try {
          // Best-effort metadata enrichment similar to /api/attachments
          let metadata: Record<string, unknown> = { originalUrl: url }
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
              // Simple meta extraction
              const metaTagRegex = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?>/gi
              const meta: Record<string, string> = {}
              let match
              while ((match = metaTagRegex.exec(html)) !== null) {
                const key = String(match[1]).toLowerCase()
                const val = String(match[2])
                meta[key] = val
              }
              const title = meta['og:title'] || meta['twitter:title'] || meta['title']
              const description = meta['og:description'] || meta['twitter:description'] || meta['description']
              let image = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image:src'] || meta['twitter:image']
              let favicon: string | undefined
              const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut\s+icon|icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i)
              if (iconMatch && iconMatch[1]) {
                favicon = iconMatch[1]
              }
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
          } catch {
            // ignore enrichment failures
          }

          await supabase
            .from('attachments')
            .insert({
              idea_id: data.id,
              type: 'url',
              url,
              filename: null,
              metadata
            })
        } catch (e) {
          // Do not block idea creation on attachment failures
          console.warn('Failed to create URL attachment for idea:', e)
        }
      }
    }

    return NextResponse.json({
      data: data,
      message: 'Idea created successfully',
      background_jobs: {
        summarization: trimmedText.length > 50 || trimmedText.split('\n').length > 2,
        embedding: true
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