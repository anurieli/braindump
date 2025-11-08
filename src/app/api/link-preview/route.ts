import { NextRequest, NextResponse } from 'next/server'

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function extractMeta(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const metaTagRegex = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?>/gi
  let match
  while ((match = metaTagRegex.exec(content)) !== null) {
    const key = match[1].toLowerCase()
    const val = match[2]
    result[key] = val
  }
  // title
  const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i)
  if (titleMatch && titleMatch[1]) {
    result['title'] = titleMatch[1].trim()
  }
  // favicon/link icon - robust to attribute order
  const linkTagRegex = /<link\b[^>]*>/gi
  let link
  while ((link = linkTagRegex.exec(content)) !== null) {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }
    // Extra hostname validation: require a TLD of >=2 letters and disallow localhost-only cases
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const tldOk = /\.([a-z]{2,})$/.test(host)
    if (!tldOk || host === 'localhost') {
      return NextResponse.json({ error: 'Unresolvable host' }, { status: 400 })
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; BrainDumpBot/1.0; +https://example.com/bot)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      // avoid following too many redirects by default
      redirect: 'follow',
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch url' }, { status: 502 })
    }
    const html = await res.text()
    const meta = extractMeta(html)

    // Prefer OG, then Twitter, then fallbacks
    const title =
      meta['og:title'] ||
      meta['twitter:title'] ||
      meta['title'] ||
      ''
    const description =
      meta['og:description'] ||
      meta['twitter:description'] ||
      meta['description'] ||
      ''
    const imageCandidate =
      meta['og:image:secure_url'] ||
      meta['og:image'] ||
      meta['twitter:image:src'] ||
      meta['twitter:image'] ||
      ''
    let favicon = meta['favicon'] || ''
    let image = imageCandidate

    // Normalize relative favicon to absolute
    try {
      if (favicon) {
        const abs = new URL(favicon, url)
        favicon = abs.href
      }
      if (image) {
        const absImg = new URL(image, url)
        image = absImg.href
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      title,
      description,
      image,
      favicon,
    })
  } catch (err) {
    console.error('link-preview error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}


