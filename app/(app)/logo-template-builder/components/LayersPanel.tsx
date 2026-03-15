'use client'

import { useState } from 'react'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useEditorStore } from '../store'
import type { EditorElement } from '../types'

const TYPE_ICON: Record<EditorElement['type'], string> = {
  rect: '▭',
  circle: '○',
  line: '─',
  text: 'T',
  curved_text: '↷',
  icon_placeholder: '⊞'
}

const TYPE_LABEL: Record<EditorElement['type'], string> = {
  rect: 'Rectangle',
  circle: 'Circle',
  line: 'Line',
  text: 'Text',
  curved_text: 'Curved Text',
  icon_placeholder: 'Icon'
}

function getElementLabel (el: EditorElement): string {
  if (el.name) return el.name
  if (el.type === 'text') return `"${el.text.slice(0, 16)}${el.text.length > 16 ? '…' : ''}"`
  if (el.type === 'curved_text') return `"${el.text.slice(0, 16)}${el.text.length > 16 ? '…' : ''}"`
  if (el.type === 'icon_placeholder') return el.label
  return TYPE_LABEL[el.type]
}

export function LayersPanel () {
  const { document: doc, selectedElementId, setSelectedElementId, reorderElement, deleteElement, duplicateElement } = useEditorStore()
  const [openId, setOpenId] = useState<string | null>(null)

  const layers = [...doc.elements].reverse()

  function handleAction (key: React.Key, el: EditorElement) {
    const idx = doc.elements.indexOf(el)
    const isTop = idx === doc.elements.length - 1
    const isBottom = idx === 0

    switch (key) {
      case 'edit':
        setSelectedElementId(el.id)
        break
      case 'bring-forward':
        if (!isTop) reorderElement(el.id, 'forward')
        break
      case 'send-back':
        if (!isBottom) reorderElement(el.id, 'backward')
        break
      case 'duplicate':
        duplicateElement(el.id)
        break
      case 'delete':
        deleteElement(el.id)
        break
    }
    setOpenId(null)
  }

  if (layers.length === 0) {
    return (
      <div className="p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Layers</p>
        <p className="text-xs text-zinc-400">No layers yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Layers <span className="font-normal normal-case opacity-50">(right-click to edit)</span>
      </p>
      <div className="space-y-0.5">
        {layers.map((el) => {
          const isSelected = el.id === selectedElementId
          const idx = doc.elements.indexOf(el)
          const isTop = idx === doc.elements.length - 1
          const isBottom = idx === 0

          return (
            <Dropdown
              key={el.id}
              isOpen={openId === el.id}
              onOpenChange={(open) => { if (!open) setOpenId(null) }}
              placement="bottom-start"
            >
              <DropdownTrigger>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedElementId(el.id)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setSelectedElementId(el.id)
                    setOpenId(el.id)
                  }}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors select-none ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="w-4 flex-shrink-0 text-center font-mono opacity-60">
                    {TYPE_ICON[el.type]}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {getElementLabel(el)}
                  </span>
                </div>
              </DropdownTrigger>

              <DropdownMenu
                aria-label="Layer actions"
                onAction={(key) => handleAction(key, el)}
              >
                <DropdownItem key="edit">Edit</DropdownItem>
                <DropdownItem key="duplicate">Duplicate</DropdownItem>
                <DropdownItem key="bring-forward" isDisabled={isTop}>Bring Forward</DropdownItem>
                <DropdownItem key="send-back" isDisabled={isBottom}>Send Back</DropdownItem>
                <DropdownItem key="delete" color="danger" className="text-danger">Delete</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )
        })}
      </div>
    </div>
  )
}
