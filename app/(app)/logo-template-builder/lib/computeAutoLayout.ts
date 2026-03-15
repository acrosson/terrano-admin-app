import type { EditorElement, AutoLayout, RectElement, CircleElement, TextElement, CurvedTextElement, LineElement, GroupElement } from '../types'

// Shared offscreen canvas for text measurement
let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx (): CanvasRenderingContext2D | null {
  if (_measureCtx) return _measureCtx
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  _measureCtx = c.getContext('2d')
  return _measureCtx
}

/** Measure the actual rendered pixel width of a text string. */
export function measureTextWidth (text: string, fontSize: number, fontFamily: string, fontStyle?: string, fontWeight?: number): number {
  const ctx = getMeasureCtx()
  if (!ctx) return text.length * fontSize * 0.6 // SSR fallback
  const weight = fontWeight ?? 400
  const style = fontStyle === 'italic' ? 'italic' : 'normal'
  ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`
  return ctx.measureText(text).width
}

function getOriginOffset (el: EditorElement): { dx: number; dy: number } {
  if (el.type === 'circle') {
    const r = (el as CircleElement).radius
    return { dx: r, dy: r }
  }
  if (el.type === 'curved_text') {
    const span = (el as CurvedTextElement).radius + (el as CurvedTextElement).fontSize
    return { dx: span, dy: span }
  }
  return { dx: 0, dy: 0 }
}

function getElementBounds (el: EditorElement): { width: number; height: number } {
  switch (el.type) {
    case 'rect':
    case 'icon_placeholder':
      return { width: (el as RectElement).width, height: (el as RectElement).height }
    case 'circle': {
      const r = (el as CircleElement).radius
      return { width: r * 2, height: r * 2 }
    }
    case 'text': {
      const t = el as TextElement
      const measured = measureTextWidth(t.text, t.fontSize, t.fontFamily, t.fontStyle, t.fontWeight)
      return { width: measured, height: t.fontSize * 1.25 }
    }
    case 'curved_text': {
      const span = (el as CurvedTextElement).radius + (el as CurvedTextElement).fontSize
      return { width: span * 2, height: span * 2 }
    }
    case 'line': {
      const pts = (el as LineElement).points
      return { width: Math.abs(pts[2] - pts[0]), height: Math.abs(pts[3] - pts[1]) }
    }
    case 'group': {
      const children = (el as GroupElement).children
      if (children.length === 0) return { width: 0, height: 0 }
      let maxX = 0
      let maxY = 0
      for (const child of children) {
        const b = getElementBounds(child)
        const o = getOriginOffset(child)
        // child.x/y may be a center point (circle, curved_text) — subtract offset to get top-left
        maxX = Math.max(maxX, (child.x - o.dx) + b.width)
        maxY = Math.max(maxY, (child.y - o.dy) + b.height)
      }
      return { width: maxX, height: maxY }
    }
    default:
      return { width: 0, height: 0 }
  }
}

/** Compute the bounding box of a list of child elements (relative coordinates). */
export function getChildrenBounds (children: EditorElement[]): { width: number; height: number } {
  if (children.length === 0) return { width: 0, height: 0 }
  let maxX = 0
  let maxY = 0
  for (const child of children) {
    const b = getElementBounds(child)
    const o = getOriginOffset(child)
    maxX = Math.max(maxX, (child.x - o.dx) + b.width)
    maxY = Math.max(maxY, (child.y - o.dy) + b.height)
  }
  return { width: maxX, height: maxY }
}

/** Update text children's width to match their measured text width (prevents Konva wrapping). */
export function syncTextWidths (children: EditorElement[]): EditorElement[] {
  return children.map(child => {
    if (child.type === 'text') {
      const t = child as TextElement
      const measured = measureTextWidth(t.text, t.fontSize, t.fontFamily, t.fontStyle, t.fontWeight)
      if (Math.abs(t.width - measured) > 1) {
        return { ...t, width: measured }
      }
    }
    return child
  })
}

export function computeAutoLayout (children: EditorElement[], layout: AutoLayout): EditorElement[] {
  if (children.length === 0) return []

  const { direction, gap, align, padding } = layout
  const bounds = children.map(c => getElementBounds(c))
  const offsets = children.map(c => getOriginOffset(c))

  const isHorizontal = direction === 'horizontal'
  const crossSizes = isHorizontal ? bounds.map(b => b.height) : bounds.map(b => b.width)
  const maxCross = Math.max(...crossSizes)

  let cursor = padding
  return children.map((child, i) => {
    const mainSize = isHorizontal ? bounds[i].width : bounds[i].height
    const crossSize = crossSizes[i]
    const { dx, dy } = offsets[i]

    const mainPos = cursor
    cursor += mainSize + gap

    let crossPos: number
    if (align === 'start') {
      crossPos = padding
    } else if (align === 'end') {
      crossPos = padding + (maxCross - crossSize)
    } else {
      crossPos = padding + (maxCross - crossSize) / 2
    }

    const x = isHorizontal ? mainPos + dx : crossPos + dx
    const y = isHorizontal ? crossPos + dy : mainPos + dy

    const positioned = { ...child, x, y }
    // Sync text element width to measured width so Konva doesn't wrap
    if (child.type === 'text') {
      ;(positioned as Record<string, unknown>).width = bounds[i].width
    }
    return positioned as EditorElement
  })
}
