'use client'

import { useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button, ButtonGroup } from '@heroui/react'
import type Konva from 'konva'
import { Toolbar } from './components/Toolbar'
import { LayersPanel } from './components/LayersPanel'
import { AlignmentBar } from './components/AlignmentBar'
import { PropertiesPanel } from './components/PropertiesPanel'
import { ExportImportPanel } from './components/ExportImportPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ExportButtons } from './components/ExportButtons'
import { useEditorStore } from './store'
import { resolveTemplateDocument } from './lib/resolveTemplateDocument'
import { exportDocumentToSvg } from './lib/exportToSvg'
import { SAMPLE_ICONS } from './data/sampleIcons'

const PADDING = 40

// react-konva requires canvas API — skip SSR
const CanvasArea = dynamic(
  () => import('./components/CanvasArea').then(m => m.CanvasArea),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading canvas...</div> }
)

const PreviewCanvas = dynamic(
  () => import('./components/PreviewCanvas').then(m => m.PreviewCanvas),
  { ssr: false, loading: () => <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">Loading preview...</div> }
)

export default function LogoTemplateBuilderPage () {
  const { document: doc, mode, previewVariables, setMode, updatePreviewVariables } = useEditorStore()
  const stageRef = useRef<Konva.Stage | null>(null)

  const handleStageMount = useCallback((stage: Konva.Stage) => {
    stageRef.current = stage
  }, [])

  const resolvedDoc = resolveTemplateDocument(doc, previewVariables)

  function triggerDownload (dataUrl: string, filename: string) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  function handleExportPng () {
    const stage = stageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({
      x: PADDING,
      y: PADDING,
      width: doc.canvas.width,
      height: doc.canvas.height,
      pixelRatio: 2
    })
    triggerDownload(dataUrl, 'logo-preview.png')
  }

  function handleExportJpeg () {
    const stage = stageRef.current
    if (!stage) return

    // Add white background for JPEG (no transparency)
    const canvas = document.createElement('canvas')
    canvas.width = doc.canvas.width * 2
    canvas.height = doc.canvas.height * 2
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const pngUrl = stage.toDataURL({
      x: PADDING,
      y: PADDING,
      width: doc.canvas.width,
      height: doc.canvas.height,
      pixelRatio: 2
    })

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      triggerDownload(canvas.toDataURL('image/jpeg', 0.92), 'logo-preview.jpg')
    }
    img.src = pngUrl
  }

  function handleExportSvg () {
    const iconVariables: Record<string, string | undefined> = {
      'icon.primary': previewVariables.icon.primaryId
    }
    const svgString = exportDocumentToSvg(resolvedDoc, SAMPLE_ICONS, iconVariables)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    triggerDownload(URL.createObjectURL(blob), 'logo-preview.svg')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Mode toggle bar */}
      <div className="flex items-center justify-center border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
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
      </div>

      {mode === 'builder' ? (
        /* ── Builder layout ── */
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar: tools + layers */}
            <div className="flex w-48 flex-shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="overflow-y-auto border-b border-zinc-200 dark:border-zinc-700">
                <Toolbar />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <LayersPanel />
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <AlignmentBar />
              <div className="flex-1 overflow-auto">
                <CanvasArea />
              </div>
            </div>

            {/* Right properties panel */}
            <div className="w-56 flex-shrink-0 overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <PropertiesPanel />
            </div>
          </div>

          {/* Bottom export/import panel */}
          <ExportImportPanel />
        </>
      ) : (
        /* ── Preview layout ── */
        <div className="flex flex-1 overflow-hidden">
          {/* Preview canvas — fills remaining space */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <PreviewCanvas
                doc={resolvedDoc}
                variables={previewVariables}
                onStageMount={handleStageMount}
              />
            </div>
            <ExportButtons
              onExportPng={handleExportPng}
              onExportJpeg={handleExportJpeg}
              onExportSvg={handleExportSvg}
            />
          </div>

          {/* Right panel: preview variables */}
          <div className="w-64 flex-shrink-0 overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <PreviewPanel
              variables={previewVariables}
              onChange={updatePreviewVariables}
            />
          </div>
        </div>
      )}
    </div>
  )
}
