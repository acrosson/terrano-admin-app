import type { TemplateDocument, EditorElement, TextElement, CurvedTextElement, SplitTextElement, GroupElement } from '../types'
import type { PreviewVariables } from '../previewTypes'
import { computeAutoLayout, getChildrenBounds, resolveSizeBindings } from './computeAutoLayout'

type VarsMap = Record<string, Record<string, string | undefined>>

/** Replace {ns.key} tokens in a string using the variables object */
function resolveTokens (value: string, vars: PreviewVariables): string {
  const map = vars as unknown as VarsMap
  return value.replace(/\{(\w+)\.(\w+)\}/g, (_match, ns, key) => {
    return map[ns]?.[key] ?? _match
  })
}

/** Resolve the bind field for a text element */
function resolveTextBind (text: string, bind: string | undefined, vars: PreviewVariables): string {
  if (!bind) return text
  const [ns, key] = bind.split('.')
  const map = vars as unknown as VarsMap
  return map[ns]?.[key] ?? text
}

function resolveElement (el: EditorElement, vars: PreviewVariables, canvasWidth: number, canvasHeight: number): EditorElement {
  switch (el.type) {
    case 'text':
      return {
        ...el,
        text: resolveTextBind(el.text, el.bind, vars),
        fill: resolveTokens(el.fill, vars),
        fontFamily: resolveTokens(el.fontFamily, vars),
      } satisfies TextElement
    case 'curved_text':
      return {
        ...el,
        text: resolveTextBind(el.text, el.bind, vars),
        fill: resolveTokens(el.fill, vars),
        fontFamily: resolveTokens(el.fontFamily, vars),
      } satisfies CurvedTextElement
    case 'split_text':
      return {
        ...el,
        fill: resolveTokens(el.fill, vars),
        part1: {
          ...el.part1,
          text: resolveTextBind(el.part1.text, el.part1.bind, vars),
          fill: el.part1.fill ? resolveTokens(el.part1.fill, vars) : undefined,
        },
        part2: {
          ...el.part2,
          text: resolveTextBind(el.part2.text, el.part2.bind, vars),
          fill: el.part2.fill ? resolveTokens(el.part2.fill, vars) : undefined,
        },
      } satisfies SplitTextElement
    case 'rect':
      return {
        ...el,
        fill: resolveTokens(el.fill, vars),
        stroke: el.stroke ? resolveTokens(el.stroke, vars) : el.stroke,
      }
    case 'circle':
      return {
        ...el,
        fill: resolveTokens(el.fill, vars),
        stroke: el.stroke ? resolveTokens(el.stroke, vars) : el.stroke,
      }
    case 'line':
      return {
        ...el,
        stroke: resolveTokens(el.stroke, vars),
      }
    case 'icon_placeholder':
      return {
        ...el,
        iconColor: el.iconColor ? resolveTokens(el.iconColor, vars) : el.iconColor,
      }
    case 'preset_icon':
      return {
        ...el,
        iconColor: el.iconColor ? resolveTokens(el.iconColor, vars) : el.iconColor,
      }
    case 'group': {
      const group = el as GroupElement
      let children = group.children.map(child => resolveElement(child, vars, canvasWidth, canvasHeight))
      // Resolve size bindings (rects tracking text size) then recalculate auto-layout
      children = resolveSizeBindings(children)
      if (group.layout) {
        children = computeAutoLayout(children, group.layout)
      }
      const resolved: GroupElement = { ...group, children }
      // Recenter if centering flags are set
      if (group.centerH || group.centerV) {
        const bounds = getChildrenBounds(children)
        if (group.centerH) resolved.x = (canvasWidth - bounds.width) / 2
        if (group.centerV) resolved.y = (canvasHeight - bounds.height) / 2
      }
      return resolved
    }
    default:
      return el
  }
}

export function resolveTemplateDocument (doc: TemplateDocument, vars: PreviewVariables): TemplateDocument {
  return {
    ...doc,
    canvas: {
      ...doc.canvas,
      background: resolveTokens(doc.canvas.background, vars),
    },
    elements: doc.elements.map(el => resolveElement(el, vars, doc.canvas.width, doc.canvas.height))
  }
}
