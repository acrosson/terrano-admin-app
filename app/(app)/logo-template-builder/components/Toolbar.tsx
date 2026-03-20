'use client'

import { useEditorStore } from '../store'

export function Toolbar () {
  const { addElement, document: doc } = useEditorStore()

  const cx = doc.canvas.width / 2
  const cy = doc.canvas.height / 2

  function addRect () {
    const id = addElement({ type: 'rect', x: cx - 100, y: cy - 60, width: 200, height: 120, fill: '#4f8ef7', stroke: undefined, strokeWidth: 0, rotation: 0, draggable: true } as Omit<import('../types').RectElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addCircle () {
    const id = addElement({ type: 'circle', x: cx, y: cy, radius: 60, fill: '#f7914f', rotation: 0, draggable: true } as Omit<import('../types').CircleElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addLine () {
    const id = addElement({ type: 'line', x: cx - 100, y: cy, points: [0, 0, 200, 0], stroke: '#333333', strokeWidth: 2, rotation: 0, draggable: true } as Omit<import('../types').LineElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addText () {
    const id = addElement({ type: 'text', x: cx - 100, y: cy - 20, text: 'Text', width: 200, fontSize: 32, fontFamily: 'sans-serif', fill: '#111111', align: 'left', rotation: 0, draggable: true } as Omit<import('../types').TextElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addCurvedText () {
    const id = addElement({ type: 'curved_text', x: cx, y: cy, text: 'Curved Text', radius: 150, startAngle: 0, fontSize: 28, fontFamily: 'sans-serif', fill: '#111111', flipped: false, rotation: 0, draggable: true } as Omit<import('../types').CurvedTextElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addSplitText () {
    const id = addElement({ type: 'split_text', x: cx - 150, y: cy, fontFamily: 'Montserrat', fontSize: 32, fill: '#000000', width: 300, rotation: 0, draggable: true, part1: { text: 'Company', fontWeight: 700, bind: 'text.wordmark_part1' }, part2: { text: 'Name', fontWeight: 400, bind: 'text.wordmark_part2' } } as Omit<import('../types').SplitTextElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addIcon () {
    const id = addElement({ type: 'icon_placeholder', x: cx - 60, y: cy - 60, width: 120, height: 120, stroke: '#666666', strokeWidth: 2, label: 'ICON', bind: 'icon.primary', rotation: 0, draggable: true } as Omit<import('../types').IconPlaceholderElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  function addPresetIcon () {
    const id = addElement({ type: 'preset_icon', x: cx - 60, y: cy - 60, width: 120, height: 120, iconId: '', iconUrl: '', iconColor: '{color.primary}', rotation: 0, draggable: true } as Omit<import('../types').PresetIconElement, 'id'>)
    useEditorStore.getState().setSelectedElementId(id)
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Add</p>
      <ToolButton onClick={addRect} label="Rectangle" icon="▭" />
      <ToolButton onClick={addCircle} label="Circle" icon="○" />
      <ToolButton onClick={addLine} label="Line" icon="─" />
      <ToolButton onClick={addText} label="Text" icon="T" />
      <ToolButton onClick={addCurvedText} label="Curved Text" icon="↷" />
      <ToolButton onClick={addSplitText} label="Split Text" icon="T₁T₂" />
      <ToolButton onClick={addIcon} label="Icon Placeholder" icon="⊞" />
      <ToolButton onClick={addPresetIcon} label="Preset Icon" icon="⊡" />
    </div>
  )
}

function ToolButton ({ onClick, label, icon, danger }: { onClick: () => void; label: string; icon: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      <span className="w-5 text-center font-mono">{icon}</span>
      {label}
    </button>
  )
}
