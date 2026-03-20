'use client'

import { Button, ButtonGroup } from '@heroui/react'
import { useEditorStore } from '../store'
import type { EditorElement, RectElement, TextElement, SplitTextElement, IconPlaceholderElement, PresetIconElement, LineElement } from '../types'

function getAlignedX (el: EditorElement, canvasWidth: number): number {
  switch (el.type) {
    case 'rect':
    case 'text':
    case 'split_text':
    case 'icon_placeholder':
    case 'preset_icon':
      return (canvasWidth - (el as RectElement | TextElement | SplitTextElement | IconPlaceholderElement | PresetIconElement).width) / 2
    case 'circle':
    case 'curved_text':
      return canvasWidth / 2
    case 'line': {
      const pts = (el as LineElement).points
      const midX = (pts[0] + pts[2]) / 2
      return canvasWidth / 2 - midX
    }
    case 'group':
      return el.x
    default:
      return (el as EditorElement).x
  }
}

function getAlignedY (el: EditorElement, canvasHeight: number): number {
  switch (el.type) {
    case 'rect':
    case 'icon_placeholder':
    case 'preset_icon':
      return (canvasHeight - (el as RectElement | IconPlaceholderElement | PresetIconElement).height) / 2
    case 'circle':
    case 'curved_text':
      return canvasHeight / 2
    case 'text':
      return (canvasHeight - (el as TextElement).fontSize) / 2
    case 'split_text':
      return (canvasHeight - (el as SplitTextElement).fontSize) / 2
    case 'line': {
      const pts = (el as LineElement).points
      const midY = (pts[1] + pts[3]) / 2
      return canvasHeight / 2 - midY
    }
    case 'group':
      return el.y
    default:
      return (el as EditorElement).y
  }
}

export function AlignmentBar () {
  const { document: doc, selectedElementId, updateElement } = useEditorStore()
  const el = doc.elements.find(e => e.id === selectedElementId) ?? null

  function centerH () {
    if (!el) return
    updateElement(el.id, { x: getAlignedX(el, doc.canvas.width) } as Partial<EditorElement>)
  }

  function centerV () {
    if (!el) return
    updateElement(el.id, { y: getAlignedY(el, doc.canvas.height) } as Partial<EditorElement>)
  }

  function centerBoth () {
    if (!el) return
    updateElement(el.id, {
      x: getAlignedX(el, doc.canvas.width),
      y: getAlignedY(el, doc.canvas.height)
    } as Partial<EditorElement>)
  }

  return (
    <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
      <span className="text-xs text-zinc-400">Align</span>
      <ButtonGroup size="sm" variant="bordered" isDisabled={!el}>
        <Button onPress={centerH} title="Center horizontally">
          ⬌ Center H
        </Button>
        <Button onPress={centerV} title="Center vertically">
          ⬍ Center V
        </Button>
        <Button onPress={centerBoth} title="Center on artboard">
          ⊕ Both
        </Button>
      </ButtonGroup>
    </div>
  )
}
