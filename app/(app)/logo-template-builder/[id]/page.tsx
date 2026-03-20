'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Breadcrumbs, BreadcrumbItem, Button, ButtonGroup, Chip, Spinner, Switch } from '@heroui/react'
import type Konva from 'konva'
import { Toolbar } from '../components/Toolbar'
import { LayersPanel } from '../components/LayersPanel'
import { AlignmentBar } from '../components/AlignmentBar'
import { PropertiesPanel } from '../components/PropertiesPanel'
import { ExportImportPanel } from '../components/ExportImportPanel'
import { PreviewPanel } from '../components/PreviewPanel'
import { ExportButtons } from '../components/ExportButtons'
import { useEditorStore } from '../store'
import { resolveTemplateDocument } from '../lib/resolveTemplateDocument'
import { useCanvasExport } from '../hooks/useCanvasExport'
import { api } from '@/lib/api/client'
import type { TemplateDocument } from '../types'

const PADDING = 40

const CanvasArea = dynamic(
  () => import('../components/CanvasArea').then(m => m.CanvasArea),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading canvas...</div> }
)

const PreviewCanvas = dynamic(
  () => import('../components/PreviewCanvas').then(m => m.PreviewCanvas),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading preview...</div> }
)

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function TemplateBuilderPage () {
  const { id } = useParams<{ id: string }>()
  const { document: doc, mode, previewVariables, setMode, updatePreviewVariables, replaceDocument } = useEditorStore()
  const stageRef = useRef<Konva.Stage | null>(null)
  const bgRectRef = useRef<Konva.Rect | null>(null)

  const [templateName, setTemplateName] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [styleTags, setStyleTags] = useState<string[]>([])
  const [pageId, setPageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Load template on mount
  useEffect(() => {
    if (!id) return

    setLoading(true)
    setPageId(null)
    setTemplateName('')
    setMode('builder')
    replaceDocument({ version: 1, canvas: { width: 800, height: 800, background: '#ffffff' }, elements: [] })

    async function load () {
      try {
        const res = await api.getDesignTemplate(id)
        const template = res.data
        if (!template) return

        setTemplateName(template.name)
        setIsActive(template.is_active)
        setStyleTags(template.style_tags ?? [])

        if (!template.pages || template.pages.length === 0) {
          // No pages yet — create the first one with an empty canvas
          const emptyDoc: TemplateDocument = {
            version: 1,
            canvas: { width: 800, height: 800, background: '#ffffff' },
            elements: []
          }
          const pageRes = await api.createDesignTemplatePage(id, {
            page_index: 0,
            page_role: 'main',
            version: 1,
            is_current: true,
            page_json: emptyDoc as unknown as Record<string, unknown>
          })
          if (pageRes.data) {
            setPageId(pageRes.data.id)
            replaceDocument(emptyDoc)
          }
        } else {
          const currentPage = template.pages.find(p => p.is_current) ?? template.pages[0]
          setPageId(currentPage.id)
          if (currentPage.page_json && (currentPage.page_json as { elements?: unknown }).elements !== undefined) {
            replaceDocument(currentPage.page_json as unknown as TemplateDocument)
          }
        }
      } catch (err) {
        console.error('Failed to load template:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // CMD+S / Ctrl+S to save
  useEffect(() => {
    function handleKeyDown (e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [doc, id, pageId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save () {
    if (!id || !pageId) return
    setSaveStatus('saving')
    try {
      await api.updateDesignTemplatePage(pageId, {
        page_json: doc as unknown as Record<string, unknown>
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleStageMount = useCallback((stage: Konva.Stage) => {
    stageRef.current = stage
  }, [])

  const resolvedDoc = resolveTemplateDocument(doc, previewVariables)

  const { exportPng: handleExportPng, exportJpeg: handleExportJpeg, exportSvg: handleExportSvg } = useCanvasExport({
    stageRef,
    doc: resolvedDoc,
    padding: PADDING,
    filename: templateName || 'logo-preview',
    iconVariables: {
      'icon.primary': previewVariables.icon.primaryUrl,
    },
    bgRectRef,
  })

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        {/* Breadcrumbs + editable name */}
        <div className="flex flex-col gap-0.5">
          <Breadcrumbs size="sm">
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem href="/design/templates">Templates</BreadcrumbItem>
            <BreadcrumbItem>{templateName}</BreadcrumbItem>
          </Breadcrumbs>
          <input
          className="w-48 truncate rounded bg-transparent px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          onBlur={async () => {
            const trimmed = templateName.trim()
            if (!trimmed || !id) return
            await api.updateDesignTemplate(id, { name: trimmed })
          }}
        />
        </div>

        {/* Mode toggle */}
        <ButtonGroup size="sm" variant="flat">
          <Button
            color={mode === 'builder' ? 'primary' : 'default'}
            variant={mode === 'builder' ? 'solid' : 'flat'}
            onPress={() => setMode('builder')}
          >
            Builder
          </Button>
          <Button
            color={mode === 'preview' ? 'primary' : 'default'}
            variant={mode === 'preview' ? 'solid' : 'flat'}
            onPress={() => setMode('preview')}
          >
            Preview
          </Button>
        </ButtonGroup>

        {/* Save controls */}
        <div className="flex items-center justify-end gap-3 md:w-48">
          <Switch
            size="sm"
            isSelected={isActive}
            onValueChange={async (val) => {
              setIsActive(val)
              await api.updateDesignTemplate(id, { is_active: val })
            }}
          >
            <span className="text-xs text-zinc-500">{isActive ? 'Active' : 'Draft'}</span>
          </Switch>
          {saveStatus === 'saved' && (
            <Chip size="sm" color="success" variant="flat">Saved</Chip>
          )}
          {saveStatus === 'error' && (
            <Chip size="sm" color="danger" variant="flat">Save failed</Chip>
          )}
          <Button
            size="sm"
            color="primary"
            isLoading={saveStatus === 'saving'}
            onPress={save}
          >
            Save
          </Button>
        </div>
      </div>

      {mode === 'builder' ? (
        <>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex w-48 flex-shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="overflow-y-auto border-b border-zinc-200 dark:border-zinc-700">
                <Toolbar />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <LayersPanel />
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <AlignmentBar />
              <div className="flex-1 overflow-auto">
                <CanvasArea />
              </div>
            </div>

            <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <PropertiesPanel />
            </div>
          </div>
          <ExportImportPanel templateId={id} initialTags={styleTags} />
        </>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <PreviewCanvas doc={resolvedDoc} variables={previewVariables} onStageMount={handleStageMount} onBgRectMount={node => { bgRectRef.current = node }} />
            </div>
            <ExportButtons onExportPng={handleExportPng} onExportJpeg={handleExportJpeg} onExportSvg={handleExportSvg} />
          </div>
          <div className="w-64 flex-shrink-0 overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <PreviewPanel variables={previewVariables} onChange={updatePreviewVariables} />
          </div>
        </div>
      )}
    </div>
  )
}
