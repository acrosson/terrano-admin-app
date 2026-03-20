'use client'

import { useState } from 'react'
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { useEditorStore } from '../store'
import type { EditorElement, SplitTextElement, GroupElement } from '../types'

const TYPE_ICON: Record<EditorElement['type'], string> = {
  rect: '▭',
  circle: '○',
  line: '─',
  text: 'T',
  curved_text: '↷',
  split_text: 'T₂',
  icon_placeholder: '⊞',
  preset_icon: '⊡',
  group: '▣'
}

const TYPE_LABEL: Record<EditorElement['type'], string> = {
  rect: 'Rectangle',
  circle: 'Circle',
  line: 'Line',
  text: 'Text',
  curved_text: 'Curved Text',
  split_text: 'Split Text',
  icon_placeholder: 'Icon',
  preset_icon: 'Preset Icon',
  group: 'Group'
}

function getElementLabel (el: EditorElement): string {
  if (el.name) return el.name
  if (el.type === 'text') return `"${el.text.slice(0, 16)}${el.text.length > 16 ? '…' : ''}"`
  if (el.type === 'curved_text') return `"${el.text.slice(0, 16)}${el.text.length > 16 ? '…' : ''}"`
  if (el.type === 'split_text') { const st = el as SplitTextElement; return `"${(st.part1.text + st.part2.text).slice(0, 16)}"` }
  if (el.type === 'icon_placeholder') return el.label
  if (el.type === 'group') return `Group (${(el as GroupElement).children.length})`
  return TYPE_LABEL[el.type]
}

export function LayersPanel () {
  const { document: doc, selectedElementIds, setSelectedElementId, setSelectedElementIds, reorderElement, deleteElement, duplicateElement, groupElements, ungroupElement } = useEditorStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const layers = [...doc.elements].reverse()
  const canGroup = selectedElementIds.length >= 2

  function toggleExpand (id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
      case 'group':
        groupElements(selectedElementIds)
        break
      case 'ungroup':
        ungroupElement(el.id)
        break
    }
    setOpenId(null)
  }

  function renderLayer (el: EditorElement, depth = 0) {
    const isSelected = selectedElementIds.includes(el.id)
    const idx = doc.elements.indexOf(el)
    const isTop = idx === doc.elements.length - 1
    const isBottom = idx === 0
    const isGroup = el.type === 'group'
    const isExpanded = expandedGroups.has(el.id)

    return (
      <div key={el.id}>
        <Dropdown
          isOpen={openId === el.id}
          onOpenChange={(open) => { if (!open) setOpenId(null) }}
          placement="bottom-start"
        >
          <DropdownTrigger>
            <div
              role="button"
              tabIndex={0}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={(e) => {
                if (isGroup) {
                  toggleExpand(el.id)
                }
                if (e.shiftKey) {
                  const ids = selectedElementIds.includes(el.id)
                    ? selectedElementIds.filter(i => i !== el.id)
                    : [...selectedElementIds, el.id]
                  setSelectedElementIds(ids)
                } else {
                  setSelectedElementId(el.id)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (!selectedElementIds.includes(el.id)) {
                  setSelectedElementId(el.id)
                }
                setOpenId(el.id)
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md pr-2 py-1.5 text-xs transition-colors select-none ${
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {isGroup && (
                <span className="w-3 flex-shrink-0 text-center opacity-50">
                  {isExpanded ? '▾' : '▸'}
                </span>
              )}
              <span className={`flex-shrink-0 text-center font-mono opacity-60 ${isGroup ? 'w-3' : 'w-4'}`}>
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
            {canGroup && !isGroup ? <DropdownItem key="group">Group</DropdownItem> : null}
            {isGroup ? <DropdownItem key="ungroup">Ungroup</DropdownItem> : null}
            <DropdownItem key="delete" color="danger" className="text-danger">Delete</DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {/* Expanded group children (read-only, for visibility) */}
        {isGroup && isExpanded && (
          <div className="border-l border-zinc-200 ml-4 dark:border-zinc-700">
            {[...(el as GroupElement).children].reverse().map(child => renderLayer(child, depth + 1))}
          </div>
        )}
      </div>
    )
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
        {layers.map(el => renderLayer(el))}
      </div>
    </div>
  )
}
