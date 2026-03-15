import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { TemplateDocument, EditorElement } from './types'
import type { PreviewVariables } from './previewTypes'
import { DEFAULT_PREVIEW_VARIABLES } from './previewTypes'

const ARTBOARD_W = 800
const ARTBOARD_H = 800

const DEFAULT_DOCUMENT: TemplateDocument = {
  version: 1,
  canvas: { width: ARTBOARD_W, height: ARTBOARD_H, background: '#ffffff' },
  elements: []
}

interface EditorState {
  document: TemplateDocument
  selectedElementId: string | null
  mode: 'builder' | 'preview'
  previewVariables: PreviewVariables
  // Actions
  addElement: (el: Omit<EditorElement, 'id'>) => string
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  deleteElement: (id: string) => void
  duplicateElement: (id: string) => void
  reorderElement: (id: string, direction: 'forward' | 'backward') => void
  setSelectedElementId: (id: string | null) => void
  replaceDocument: (doc: TemplateDocument) => void
  updateCanvas: (patch: Partial<TemplateDocument['canvas']>) => void
  setMode: (mode: 'builder' | 'preview') => void
  updatePreviewVariables: (patch: Partial<PreviewVariables>) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: DEFAULT_DOCUMENT,
  selectedElementId: null,
  mode: 'builder',
  previewVariables: DEFAULT_PREVIEW_VARIABLES,

  addElement: (el) => {
    const id = nanoid()
    const newEl = { ...el, id } as EditorElement
    set(s => ({ document: { ...s.document, elements: [...s.document.elements, newEl] } }))
    return id
  },

  updateElement: (id, patch) => {
    set(s => ({
      document: {
        ...s.document,
        elements: s.document.elements.map(el =>
          el.id === id ? { ...el, ...patch } as EditorElement : el
        )
      }
    }))
  },

  deleteElement: (id) => {
    set(s => ({
      document: { ...s.document, elements: s.document.elements.filter(el => el.id !== id) },
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId
    }))
  },

  duplicateElement: (id) => {
    const el = get().document.elements.find(e => e.id === id)
    if (!el) return
    const newId = nanoid()
    const dup = { ...el, id: newId, x: el.x + 20, y: el.y + 20 }
    set(s => ({
      document: { ...s.document, elements: [...s.document.elements, dup] },
      selectedElementId: newId
    }))
  },

  reorderElement: (id, direction) => {
    set(s => {
      const els = [...s.document.elements]
      const idx = els.findIndex(e => e.id === id)
      if (idx === -1) return s
      if (direction === 'forward' && idx < els.length - 1) {
        ;[els[idx], els[idx + 1]] = [els[idx + 1], els[idx]]
      } else if (direction === 'backward' && idx > 0) {
        ;[els[idx], els[idx - 1]] = [els[idx - 1], els[idx]]
      }
      return { document: { ...s.document, elements: els } }
    })
  },

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  replaceDocument: (doc) => set({ document: doc, selectedElementId: null }),

  updateCanvas: (patch) => set(s => ({
    document: { ...s.document, canvas: { ...s.document.canvas, ...patch } }
  })),

  setMode: (mode) => set({ mode, selectedElementId: null }),

  updatePreviewVariables: (patch) => set(s => ({
    previewVariables: {
      ...s.previewVariables,
      ...patch,
      text: { ...s.previewVariables.text, ...(patch.text ?? {}) },
      icon: { ...s.previewVariables.icon, ...(patch.icon ?? {}) },
      color: { ...s.previewVariables.color, ...(patch.color ?? {}) },
      font: { ...s.previewVariables.font, ...(patch.font ?? {}) },
    }
  }))
}))
