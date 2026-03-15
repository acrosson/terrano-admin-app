import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { TemplateDocument, EditorElement, GroupElement, AutoLayout } from './types'
import type { PreviewVariables } from './previewTypes'
import { DEFAULT_PREVIEW_VARIABLES } from './previewTypes'
import { computeAutoLayout, getChildrenBounds, syncTextWidths } from './lib/computeAutoLayout'

const ARTBOARD_W = 800
const ARTBOARD_H = 800

/** Recursively find an element by id, searching into group children. */
export function findElementById (elements: EditorElement[], id: string): EditorElement | null {
  for (const el of elements) {
    if (el.id === id) return el
    if (el.type === 'group') {
      const found = findElementById((el as GroupElement).children, id)
      if (found) return found
    }
  }
  return null
}

/** Recursively update a child element inside groups.
 *  Returns the new top-level elements array with the child patched
 *  and any parent group re-laid-out / re-centered. */
function updateElementRecursive (
  elements: EditorElement[],
  id: string,
  patch: Partial<EditorElement>,
  canvas: { width: number; height: number }
): EditorElement[] {
  return elements.map(el => {
    if (el.id === id) {
      return { ...el, ...patch } as EditorElement
    }
    if (el.type === 'group') {
      const group = el as GroupElement
      const childIds = collectIds(group.children)
      if (!childIds.has(id)) return el
      // Recurse into children
      let newChildren = updateElementRecursive(group.children, id, patch, canvas)
      // Re-run auto-layout if enabled
      if (group.layout) {
        newChildren = computeAutoLayout(newChildren, group.layout)
      } else {
        newChildren = syncTextWidths(newChildren)
      }
      const updated: GroupElement = { ...group, children: newChildren }
      // Re-center if centering is active
      if (group.centerH || group.centerV) {
        const bounds = getChildrenBounds(newChildren)
        if (group.centerH) updated.x = (canvas.width - bounds.width) / 2
        if (group.centerV) updated.y = (canvas.height - bounds.height) / 2
      }
      return updated
    }
    return el
  })
}

/** Collect all IDs in a tree of elements (including nested group children). */
function collectIds (elements: EditorElement[]): Set<string> {
  const ids = new Set<string>()
  for (const el of elements) {
    ids.add(el.id)
    if (el.type === 'group') {
      for (const cid of collectIds((el as GroupElement).children)) {
        ids.add(cid)
      }
    }
  }
  return ids
}

const DEFAULT_DOCUMENT: TemplateDocument = {
  version: 1,
  canvas: { width: ARTBOARD_W, height: ARTBOARD_H, background: '#ffffff' },
  elements: []
}

interface EditorState {
  document: TemplateDocument
  selectedElementId: string | null
  selectedElementIds: string[]
  mode: 'builder' | 'preview'
  previewVariables: PreviewVariables
  // Actions
  addElement: (el: Omit<EditorElement, 'id'>) => string
  updateElement: (id: string, patch: Partial<EditorElement>) => void
  deleteElement: (id: string) => void
  duplicateElement: (id: string) => void
  reorderElement: (id: string, direction: 'forward' | 'backward') => void
  setSelectedElementId: (id: string | null) => void
  setSelectedElementIds: (ids: string[]) => void
  groupElements: (ids: string[]) => void
  ungroupElement: (id: string) => void
  replaceDocument: (doc: TemplateDocument) => void
  updateCanvas: (patch: Partial<TemplateDocument['canvas']>) => void
  setGroupLayout: (id: string, layout: AutoLayout | undefined) => void
  setGroupCenter: (id: string, centerH: boolean, centerV: boolean) => void
  setMode: (mode: 'builder' | 'preview') => void
  updatePreviewVariables: (patch: Partial<PreviewVariables>) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  document: DEFAULT_DOCUMENT,
  selectedElementId: null,
  selectedElementIds: [],
  mode: 'builder',
  previewVariables: DEFAULT_PREVIEW_VARIABLES,

  addElement: (el) => {
    const id = nanoid()
    const newEl = { ...el, id } as EditorElement
    set(s => ({ document: { ...s.document, elements: [...s.document.elements, newEl] } }))
    return id
  },

  updateElement: (id, patch) => {
    set(s => {
      const canvas = s.document.canvas
      const elements = updateElementRecursive(s.document.elements, id, patch, canvas)
      return { document: { ...s.document, elements } }
    })
  },

  deleteElement: (id) => {
    set(s => ({
      document: { ...s.document, elements: s.document.elements.filter(el => el.id !== id) },
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
      selectedElementIds: s.selectedElementIds.filter(i => i !== id)
    }))
  },

  duplicateElement: (id) => {
    const el = get().document.elements.find(e => e.id === id)
    if (!el) return
    const newId = nanoid()
    const dupBase = { ...el, id: newId, x: el.x + 20, y: el.y + 20 }
    // Re-assign child IDs if duplicating a group
    const dup = el.type === 'group'
      ? { ...dupBase, children: (el as GroupElement).children.map(c => ({ ...c, id: nanoid() })) }
      : dupBase
    set(s => ({
      document: { ...s.document, elements: [...s.document.elements, dup as EditorElement] },
      selectedElementId: newId,
      selectedElementIds: [newId]
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

  setSelectedElementId: (id) => set({ selectedElementId: id, selectedElementIds: id ? [id] : [] }),

  setSelectedElementIds: (ids) => set({ selectedElementIds: ids, selectedElementId: ids[ids.length - 1] ?? null }),

  groupElements: (ids) => {
    const { document: doc } = get()
    const elements = ids.map(id => doc.elements.find(e => e.id === id)).filter(Boolean) as EditorElement[]
    if (elements.length < 2) return

    const idSet = new Set(ids)
    const minX = Math.min(...elements.map(e => e.x))
    const minY = Math.min(...elements.map(e => e.y))

    const children = elements.map(e => ({ ...e, x: e.x - minX, y: e.y - minY }))
    const groupId = nanoid()
    const group: GroupElement = { id: groupId, type: 'group', x: minX, y: minY, rotation: 0, draggable: true, children }

    // Insert group at the position of the topmost selected element
    const maxIdx = Math.max(...elements.map(e => doc.elements.findIndex(el => el.id === e.id)))
    const remaining = doc.elements.filter(e => !idSet.has(e.id))
    const insertAt = doc.elements.slice(0, maxIdx + 1).filter(e => !idSet.has(e.id)).length
    const newElements = [...remaining.slice(0, insertAt), group, ...remaining.slice(insertAt)]

    set({ document: { ...doc, elements: newElements }, selectedElementId: groupId, selectedElementIds: [groupId] })
  },

  ungroupElement: (id) => {
    const { document: doc } = get()
    const el = doc.elements.find(e => e.id === id)
    if (!el || el.type !== 'group') return
    const group = el as GroupElement
    const children = group.children.map(c => ({ ...c, x: c.x + group.x, y: c.y + group.y }))
    const idx = doc.elements.findIndex(e => e.id === id)
    const newElements = [...doc.elements.slice(0, idx), ...children, ...doc.elements.slice(idx + 1)]
    set({
      document: { ...doc, elements: newElements },
      selectedElementIds: children.map(c => c.id),
      selectedElementId: children[children.length - 1]?.id ?? null
    })
  },

  setGroupLayout: (id, layout) => {
    const el = get().document.elements.find(e => e.id === id)
    if (!el || el.type !== 'group') return
    const group = el as GroupElement
    const newChildren = layout
      ? computeAutoLayout(group.children, layout)
      : group.children
    const updated = { ...group, layout, children: newChildren }
    // Re-center if centering is active
    const canvas = get().document.canvas
    if (updated.centerH || updated.centerV) {
      const bounds = getChildrenBounds(newChildren)
      if (updated.centerH) updated.x = (canvas.width - bounds.width) / 2
      if (updated.centerV) updated.y = (canvas.height - bounds.height) / 2
    }
    set(s => ({
      document: {
        ...s.document,
        elements: s.document.elements.map(e =>
          e.id === id ? updated as GroupElement : e
        )
      }
    }))
  },

  setGroupCenter: (id, centerH, centerV) => {
    const el = get().document.elements.find(e => e.id === id)
    if (!el || el.type !== 'group') return
    const group = el as GroupElement
    const canvas = get().document.canvas
    const bounds = getChildrenBounds(group.children)
    const x = centerH ? (canvas.width - bounds.width) / 2 : group.x
    const y = centerV ? (canvas.height - bounds.height) / 2 : group.y
    set(s => ({
      document: {
        ...s.document,
        elements: s.document.elements.map(e =>
          e.id === id ? { ...e, centerH, centerV, x, y } as GroupElement : e
        )
      }
    }))
  },

  replaceDocument: (doc) => set({ document: doc, selectedElementId: null, selectedElementIds: [] }),

  updateCanvas: (patch) => set(s => ({
    document: { ...s.document, canvas: { ...s.document.canvas, ...patch } }
  })),

  setMode: (mode) => set({ mode, selectedElementId: null, selectedElementIds: [] }),

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
