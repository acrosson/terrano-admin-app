import { NextRequest } from 'next/server'

export async function GET (request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return new Response('Missing url param', { status: 400 })

  const res = await fetch(url)
  if (!res.ok) return new Response('Failed to fetch image', { status: res.status })

  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const isSvg = contentType.includes('svg') || url.endsWith('.svg')

  const w = request.nextUrl.searchParams.get('w')
  const h = request.nextUrl.searchParams.get('h')

  if (isSvg && w && h) {
    const text = await res.text()
    const sized = text.replace(/<svg([\s\S]*?)>/, (_, attrs) => {
      const cleaned = attrs
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
      return `<svg${cleaned} width="${w}" height="${h}">`
    })
    return new Response(sized, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
