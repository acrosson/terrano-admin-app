'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useEditorStore } from '../store'
import type { TemplateDocument } from '../types'
import { api } from '@/lib/api/client'

interface ExportImportPanelProps {
  templateId?: string
  initialTags?: string[]
}

export function ExportImportPanel ({ templateId, initialTags = [] }: ExportImportPanelProps) {
  const { document: doc, replaceDocument } = useEditorStore()
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [tab, setTab] = useState<'export' | 'import' | 'tags'>('export')

  // Tags state
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagInput, setTagInput] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const json = JSON.stringify(doc, null, 2)

  function handleCopy () {
    navigator.clipboard.writeText(json)
  }

  function handleDownload () {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport () {
    setImportError(null)
    try {
      const parsed = JSON.parse(importText) as TemplateDocument
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON')
      if (!parsed.canvas) throw new Error('Missing canvas field')
      if (!Array.isArray(parsed.elements)) throw new Error('elements must be an array')
      replaceDocument(parsed)
      setImportText('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse JSON')
    }
  }

  async function saveTags (nextTags: string[]) {
    if (!templateId) return
    setSavingTags(true)
    try {
      await api.updateDesignTemplate(templateId, { style_tags: nextTags })
    } finally {
      setSavingTags(false)
    }
  }

  function addTag () {
    const value = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!value || tags.includes(value)) { setTagInput(''); return }
    const next = [...tags, value]
    setTags(next)
    setTagInput('')
    void saveTags(next)
  }

  function removeTag (tag: string) {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    void saveTags(next)
  }

  function handleKeyDown (e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const tabClass = (t: string) =>
    `rounded px-3 py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-primary text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`

  return (
    <div className="border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={() => setTab('export')} className={tabClass('export')}>Export JSON</button>
        <button onClick={() => setTab('import')} className={tabClass('import')}>Import JSON</button>
        <button onClick={() => setTab('tags')} className={tabClass('tags')}>Tags {tags.length > 0 && `(${tags.length})`}</button>
      </div>

      {tab === 'export' && (
        <div className="px-4 pb-3">
          <textarea
            readOnly
            value={json}
            rows={6}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={handleCopy} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Copy JSON
            </button>
            <button onClick={handleDownload} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Download JSON
            </button>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="px-4 pb-3">
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Paste JSON here..."
            rows={6}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          />
          {importError && <p className="mt-1 text-xs text-red-500">{importError}</p>}
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
          >
            Import
          </button>
        </div>
      )}

      {tab === 'tags' && (
        <div className="px-4 pb-3">
          <p className="mb-1.5 text-xs text-zinc-400">
            <span className="font-medium text-zinc-500">Examples:</span> trust, innovation, luxury, approachable, energetic, professional, creative, reliable, bold, calm, minimal, hand-drawn, 3d, geometric, vintage, cartoon
          </p>
          <div
            className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900 cursor-text"
            onClick={() => inputRef.current?.focus()}
          >
            {tags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
              >
                {tag}
                <button
                  onClick={e => { e.stopPropagation(); removeTag(tag) }}
                  className="ml-0.5 text-primary/60 hover:text-primary leading-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
              className="min-w-[120px] flex-1 bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-200"
            />
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            Press <kbd className="rounded border border-zinc-200 px-1 dark:border-zinc-600">Enter</kbd> or <kbd className="rounded border border-zinc-200 px-1 dark:border-zinc-600">,</kbd> to add · Backspace to remove last
            {savingTags && <span className="ml-2 text-zinc-400">Saving…</span>}
          </p>
        </div>
      )}
    </div>
  )
}
