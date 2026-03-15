'use client'

import { useState, useEffect, useRef } from 'react'
import FontFaceObserver from 'fontfaceobserver'
import { api } from '@/lib/api/client'
import type { DesignFont } from '@/lib/api/client'

const injectedFonts = new Set<string>()

export function injectFontCss (font: DesignFont) {
  if (injectedFonts.has(font.id)) return
  injectedFonts.add(font.id)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = font.google_font_css_url
  document.head.appendChild(link)
}

export function useFonts () {
  const [fonts, setFonts] = useState<DesignFont[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    api.getDesignFonts()
      .then(async res => {
        if (res.data) {
          setFonts(res.data)
          res.data.forEach(injectFontCss)

          // FontFaceObserver polls text width to detect when each font is
          // truly renderable. Race against a 3s timeout so we never block
          // indefinitely if a font fails to load.
          await Promise.race([
            Promise.all(
              res.data.map(font =>
                new FontFaceObserver(font.family).load(null, 3000).catch(() => null)
              )
            ),
            new Promise<void>(resolve => setTimeout(resolve, 3000)),
          ])
        }
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setLoading(false)
        setReady(true)
      })
  }, [])

  return { fonts, loading, ready, error }
}

/** Build the canvas/Konva fontStyle string from style + weight */
export function buildFontStyle (style?: string, weight?: number): string {
  const italic = style === 'italic' ? 'italic' : ''
  const w = weight && weight !== 400 ? String(weight) : ''
  if (italic && w) return `${italic} ${w}`
  return italic || w || 'normal'
}
