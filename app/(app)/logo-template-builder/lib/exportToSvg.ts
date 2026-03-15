import type { TemplateDocument, EditorElement, RectElement, CircleElement, LineElement, TextElement, CurvedTextElement, IconPlaceholderElement, GroupElement } from '../types'
import type { SampleIcon } from '../data/sampleIcons'

function escapeXml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rotateTransform (angle: number, cx: number, cy: number): string {
  if (angle === 0) return ''
  return ` transform="rotate(${angle}, ${cx}, ${cy})"`
}

function renderRect (el: RectElement): string {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${escapeXml(el.fill)}" ${el.stroke ? `stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth ?? 0}"` : ''}${rotateTransform(el.rotation, cx, cy)}/>`
}

function renderCircle (el: CircleElement): string {
  return `<circle cx="${el.x}" cy="${el.y}" r="${el.radius}" fill="${escapeXml(el.fill)}" ${el.stroke ? `stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth ?? 0}"` : ''}${rotateTransform(el.rotation, el.x, el.y)}/>`
}

function renderLine (el: LineElement): string {
  const [x1, y1, x2, y2] = el.points
  return `<line x1="${el.x + x1}" y1="${el.y + y1}" x2="${el.x + x2}" y2="${el.y + y2}" stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}"${rotateTransform(el.rotation, el.x + x1, el.y + y1)}/>`
}

function renderText (el: TextElement): string {
  const cx = el.x + el.width / 2
  const cy = el.y + el.fontSize / 2
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'
  const x = el.align === 'center' ? cx : el.align === 'right' ? el.x + el.width : el.x
  return `<text x="${x}" y="${el.y + el.fontSize}" font-size="${el.fontSize}" font-family="${escapeXml(el.fontFamily)}" ${el.fontStyle ? `font-style="${el.fontStyle}"` : ''} fill="${escapeXml(el.fill)}" text-anchor="${anchor}"${rotateTransform(el.rotation, cx, cy)}>${escapeXml(el.text)}</text>`
}

function renderCurvedText (el: CurvedTextElement, idPrefix: string): string {
  const { x: cx, y: cy, radius: r } = el
  // Build arc path: base arc is horizontal, then rotate by startAngle
  // Top arc (flipped=false): from left to right through top → counterclockwise in SVG (sweep=0)
  // Bottom arc (flipped=true): from right to left through bottom → counterclockwise from right (sweep=0)
  let arcPath: string
  if (!el.flipped) {
    arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
  } else {
    arcPath = `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`
  }

  const totalRotation = el.startAngle + el.rotation
  const pathId = `${idPrefix}-arc`

  return `<defs>
    <path id="${pathId}" d="${arcPath}"/>
  </defs>
  <text font-size="${el.fontSize}" font-family="${escapeXml(el.fontFamily)}" fill="${escapeXml(el.fill)}"${totalRotation !== 0 ? ` transform="rotate(${totalRotation}, ${cx}, ${cy})"` : ''}>
    <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(el.text)}</textPath>
  </text>`
}

function renderIconPlaceholder (el: IconPlaceholderElement, icons: SampleIcon[], iconId: string | undefined, iconUrl: string | undefined): string {
  const icon = icons.find(i => i.id === iconId)
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2

  if (icon) {
    // Built-in sample icon — render as scaled <path>
    const scaleX = el.width / 24
    const scaleY = el.height / 24
    return `<g transform="translate(${el.x}, ${el.y}) scale(${scaleX}, ${scaleY})${el.rotation !== 0 ? ` rotate(${el.rotation}, ${12}, ${12})` : ''}">
    <path d="${icon.svgPath}" fill="${escapeXml(el.iconColor ?? el.stroke)}"/>
  </g>`
  }

  if (iconUrl) {
    // API icon — embed as <image> pointing to the S3 URL
    return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${escapeXml(iconUrl)}"${rotateTransform(el.rotation, cx, cy)}/>`
  }

  // No icon selected — render placeholder box
  return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="#aaaaaa" stroke-width="1" stroke-dasharray="6 4"${rotateTransform(el.rotation, cx, cy)}/>`
}

function renderElement (el: EditorElement, icons: SampleIcon[], iconVars: Record<string, string | undefined>): string {
  switch (el.type) {
    case 'rect': return renderRect(el)
    case 'circle': return renderCircle(el)
    case 'line': return renderLine(el)
    case 'text': return renderText(el)
    case 'curved_text': return renderCurvedText(el, el.id)
    case 'icon_placeholder': {
      const iconId = el.bind ? iconVars[`${el.bind}.id`] : undefined
      const iconUrl = el.bind ? iconVars[`${el.bind}.url`] : undefined
      return renderIconPlaceholder(el, icons, iconId, iconUrl)
    }
    case 'group': {
      const group = el as GroupElement
      const rotate = group.rotation !== 0 ? ` rotate(${group.rotation}, 0, 0)` : ''
      const children = group.children.map(child => renderElement(child, icons, iconVars)).join('\n    ')
      return `<g transform="translate(${group.x}, ${group.y})${rotate}">\n    ${children}\n  </g>`
    }
    default: return ''
  }
}

export function exportDocumentToSvg (
  doc: TemplateDocument,
  icons: SampleIcon[],
  iconVariables: Record<string, string | undefined> = {}
): string {
  const { width, height, background } = doc.canvas
  const elements = doc.elements.map(el => renderElement(el, icons, iconVariables)).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(background)}"/>
  ${elements}
</svg>`
}
