export type ElementType =
  | 'rect'
  | 'circle'
  | 'line'
  | 'text'
  | 'curved_text'
  | 'icon_placeholder'
  | 'group'

export interface CanvasSettings {
  width: number
  height: number
  background: string
}

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  rotation: number
  draggable: boolean
  name?: string
}

export interface RectElement extends BaseElement {
  type: 'rect'
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  sizeBind?: SizeBind
}

export interface CircleElement extends BaseElement {
  type: 'circle'
  radius: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

export interface LineElement extends BaseElement {
  type: 'line'
  points: number[]
  stroke: string
  strokeWidth: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  width: number
  fontSize: number
  fontFamily: string
  fontStyle?: string   // 'normal' | 'italic'
  fontWeight?: number  // e.g. 400, 700 — from design fonts API
  fill: string
  align?: 'left' | 'center' | 'right'
  bind?: string  // e.g. 'text.wordmark', 'text.tagline'
}

export interface CurvedTextElement extends BaseElement {
  type: 'curved_text'
  text: string
  radius: number
  startAngle: number  // degrees: 0 = top, 90 = right, clockwise
  fontSize: number
  fontFamily: string
  fontStyle?: string   // 'normal' | 'italic'
  fontWeight?: number  // e.g. 400, 700 — from design fonts API
  fill: string
  flipped: boolean   // false = text outside arc (top), true = text inside arc (bottom)
  bind?: string  // e.g. 'text.wordmark', 'text.tagline'
}

export interface IconPlaceholderElement extends BaseElement {
  type: 'icon_placeholder'
  width: number
  height: number
  stroke: string
  strokeWidth: number
  label: string
  bind?: string
  iconId?: string          // API icon ID (from design icons endpoint)
  iconPreviewUrl?: string  // URL for canvas/preview rendering
  iconColor?: string       // Color applied to the SVG (replaces currentColor)
  sizeBind?: SizeBind
}

export interface SizeBind {
  targetId: string         // sibling element whose measured bounds to follow
  axis: 'width' | 'height' | 'both'
  paddingX?: number        // extra px added to each side horizontally
  paddingY?: number        // extra px added to each side vertically
}

export type AutoLayoutDirection = 'horizontal' | 'vertical' | 'stack'
export type AutoLayoutAlign = 'start' | 'center' | 'end'

export interface AutoLayout {
  direction: AutoLayoutDirection
  gap: number         // px between children on main axis
  align: AutoLayoutAlign  // cross-axis alignment
  padding: number     // uniform inner padding on all sides
}

export interface GroupElement extends BaseElement {
  type: 'group'
  children: EditorElement[]  // positions are relative to the group's x,y
  layout?: AutoLayout   // undefined = free layout (existing behaviour)
  centerH?: boolean     // keep group horizontally centered on canvas
  centerV?: boolean     // keep group vertically centered on canvas
}

export type EditorElement =
  | RectElement
  | CircleElement
  | LineElement
  | TextElement
  | CurvedTextElement
  | IconPlaceholderElement
  | GroupElement

export interface TemplateDocument {
  version: number
  canvas: CanvasSettings
  elements: EditorElement[]
}
