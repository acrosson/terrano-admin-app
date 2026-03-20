'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Breadcrumbs, BreadcrumbItem, Spinner, Button, ButtonGroup, Divider, Select, SelectItem } from '@heroui/react'
import { api } from '@/lib/api/client'
import type { DesignRequest, DesignProject, ColorPalette } from '@/lib/api/client'
import type Konva from 'konva'

const ICON_S3_BASE = 'https://terrano-ai.s3.us-east-1.amazonaws.com'
import type { TemplateDocument } from '@/app/(app)/logo-template-builder/types'
import type { PreviewVariables } from '@/app/(app)/logo-template-builder/previewTypes'
import { resolveTemplateDocument } from '@/app/(app)/logo-template-builder/lib/resolveTemplateDocument'
import { useCanvasExport } from '@/app/(app)/logo-template-builder/hooks/useCanvasExport'
import { useFonts } from '@/app/(app)/logo-template-builder/hooks/useFonts'

const PreviewCanvas = dynamic(
  () => import('@/app/(app)/logo-template-builder/components/PreviewCanvas').then(m => m.PreviewCanvas),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-xs text-zinc-400">Loading…</div> }
)

function toPreviewVariables (vars: Record<string, string>): PreviewVariables {
  return {
    text: {
      wordmark: vars['text.wordmark'] ?? '',
      tagline: vars['text.tagline'],
      initials: vars['text.initials'],
      est_year: vars['text.est_year'],
      wordmark_part1: vars['text.wordmark_part1'],
      wordmark_part2: vars['text.wordmark_part2'],
    },
    icon: {
      primaryUrl: vars['icon.primary'] ? `${ICON_S3_BASE}/${vars['icon.primary']}` : undefined,
      custom_brandmarkUrl: vars['icon.custom_brandmark'] ? `${ICON_S3_BASE}/${vars['icon.custom_brandmark']}` : undefined,
      custom_wordmarkUrl: vars['icon.custom_wordmark'] ? `${ICON_S3_BASE}/${vars['icon.custom_wordmark']}` : undefined,
      custom_comboUrl: vars['icon.custom_combo'] ? `${ICON_S3_BASE}/${vars['icon.custom_combo']}` : undefined,
    },
    color: {
      primary: vars['color.primary'] ?? '#000000',
      secondary: vars['color.secondary'],
      background: vars['color.background'],
    },
    font: {
      primary: vars['font.primary'] ?? '',
    },
  }
}

const CANVAS_PADDING = 40

export default function DesignProjectDetailPage () {
  const { id: requestId, projectId } = useParams<{ id: string; projectId: string }>()
  const { ready: fontsReady } = useFonts()

  const [request, setRequest] = useState<DesignRequest | null>(null)
  const [project, setProject] = useState<DesignProject | null>(null)
  const [palettes, setPalettes] = useState<ColorPalette[]>([])
  const [loading, setLoading] = useState(true)

  // Color overrides — null means use the project's original value
  const [colorOverrides, setColorOverrides] = useState<{
    primary: string | null
    secondary: string | null
    background: string | null
  }>({ primary: null, secondary: null, background: null })
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId || !projectId) return
    Promise.all([
      api.getDesignRequest(requestId),
      api.getDesignRequestProjects(requestId),
      api.getColorPalettes(),
    ]).then(([reqRes, projRes, palRes]) => {
      setRequest(reqRes.data)
      const found = (projRes.data ?? []).find(p => p.id === projectId) ?? null
      setProject(found)
      setPalettes(palRes.data ?? [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [requestId, projectId])

  const stageRef = useRef<Konva.Stage | null>(null)
  const bgRectRef = useRef<Konva.Rect | null>(null)

  // Canvas sizing
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [project])

  function applyPalette (palette: ColorPalette) {
    setSelectedPaletteId(palette.id)
    setColorOverrides({
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
    })
  }

  function resetColors () {
    setSelectedPaletteId(null)
    setColorOverrides({ primary: null, secondary: null, background: null })
  }


  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!request || !project) {
    return <p className="text-sm text-zinc-500">Project not found.</p>
  }

  const businessName = request.input_data?.business_name ?? 'Design Request'
  const page = project.pages.find(p => p.is_current) ?? project.pages[0]

  if (!page) {
    return (
      <div className="space-y-4">
        <Breadcrumbs>
          <BreadcrumbItem href="/design">Design</BreadcrumbItem>
          <BreadcrumbItem href="/design/requests">Requests</BreadcrumbItem>
          <BreadcrumbItem href={`/design/requests/${requestId}`}>{businessName}</BreadcrumbItem>
          <BreadcrumbItem>{project.title}</BreadcrumbItem>
        </Breadcrumbs>
        <p className="text-sm text-zinc-500">No page data available for this project.</p>
      </div>
    )
  }

  // Build preview variables with color overrides applied
  const baseVars = toPreviewVariables(project.variables)
  const previewVars: PreviewVariables = {
    ...baseVars,
    color: {
      primary: colorOverrides.primary ?? baseVars.color.primary,
      secondary: colorOverrides.secondary ?? baseVars.color.secondary,
      background: colorOverrides.background ?? baseVars.color.background,
    },
  }

  const doc = resolveTemplateDocument(page.page_json as unknown as TemplateDocument, previewVars)
  const artboardW = doc.canvas.width
  const artboardH = doc.canvas.height

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { exportPng, exportJpeg, exportSvg } = useCanvasExport({
    stageRef,
    doc,
    padding: CANVAS_PADDING,
    filename: project.title,
    iconVariables: { 'icon.primary': previewVars.icon.primaryUrl },
    bgRectRef,
  })
  const canvasW = artboardW + CANVAS_PADDING * 2
  const canvasH = artboardH + CANVAS_PADDING * 2
  const scale = containerWidth > 0 ? containerWidth / artboardW : 0
  const offset = -(CANVAS_PADDING * scale)

  // Effective colors for the inputs
  const effectivePrimary = colorOverrides.primary ?? baseVars.color.primary
  const effectiveSecondary = colorOverrides.secondary ?? baseVars.color.secondary ?? '#ffffff'
  const effectiveBackground = colorOverrides.background ?? baseVars.color.background ?? '#ffffff'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumbs>
          <BreadcrumbItem href="/design">Design</BreadcrumbItem>
          <BreadcrumbItem href="/design/requests">Requests</BreadcrumbItem>
          <BreadcrumbItem href={`/design/requests/${requestId}`}>{businessName}</BreadcrumbItem>
          <BreadcrumbItem>{project.title}</BreadcrumbItem>
        </Breadcrumbs>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</h1>
      </div>

      {/* Main layout: canvas + right panel */}
      <div className="flex gap-6">
        {/* Canvas — takes remaining space */}
        <div className="min-w-0 flex-1">
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            style={{ aspectRatio: `${artboardW} / ${artboardH}` }}
          >
            {scale > 0 && (
              <div style={{ position: 'absolute', top: offset, left: offset, transform: `scale(${scale})`, transformOrigin: '0 0', width: canvasW, height: canvasH }}>
                <PreviewCanvas
                  key={`${String(fontsReady)}-${effectivePrimary}-${effectiveSecondary}-${effectiveBackground}`}
                  doc={doc}
                  variables={previewVars}
                  onStageMount={stage => { stageRef.current = stage }}
                  onBgRectMount={node => { bgRectRef.current = node }}
                />
              </div>
            )}
          </div>
          {/* Export buttons */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Export:</span>
            <ButtonGroup size="sm" variant="flat">
              <Button onPress={exportPng}>PNG</Button>
              <Button onPress={exportJpeg}>JPEG</Button>
              <Button onPress={exportSvg}>SVG</Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Right panel — fixed width */}
        <div className="w-72 flex-shrink-0 space-y-5">
          {/* Color Palette Picker */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Color Palette</p>
            <Select
              size="sm"
              placeholder="Select a palette…"
              selectedKeys={selectedPaletteId ? [selectedPaletteId] : []}
              onSelectionChange={keys => {
                const id = Array.from(keys)[0] as string
                if (!id) { resetColors(); return }
                const palette = palettes.find(p => p.id === id)
                if (palette) applyPalette(palette)
              }}
              renderValue={items => {
                const palette = palettes.find(p => p.id === items[0]?.key)
                if (!palette) return null
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.background }} />
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.primary }} />
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.secondary }} />
                    </div>
                    <span className="truncate text-sm">{palette.name}</span>
                  </div>
                )
              }}
            >
              {palettes.map(palette => (
                <SelectItem
                  key={palette.id}
                  textValue={palette.name}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.background }} />
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.primary }} />
                      <span className="h-3.5 w-3.5 rounded-sm border border-zinc-200" style={{ backgroundColor: palette.secondary }} />
                    </div>
                    <span className="truncate">{palette.name}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
            {selectedPaletteId && (
              <Button size="sm" variant="flat" className="mt-2 w-full" onPress={resetColors}>
                Reset to Original
              </Button>
            )}
          </div>

          <Divider />

          {/* Manual Color Overrides */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Color Overrides</p>
            <div className="space-y-3">
              <ColorField
                label="Primary"
                value={effectivePrimary}
                onChange={v => {
                  setSelectedPaletteId(null)
                  setColorOverrides(prev => ({ ...prev, primary: v }))
                }}
              />
              <ColorField
                label="Secondary"
                value={effectiveSecondary}
                onChange={v => {
                  setSelectedPaletteId(null)
                  setColorOverrides(prev => ({ ...prev, secondary: v }))
                }}
              />
              <ColorField
                label="Background"
                value={effectiveBackground}
                onChange={v => {
                  setSelectedPaletteId(null)
                  setColorOverrides(prev => ({ ...prev, background: v }))
                }}
              />
            </div>
            {(colorOverrides.primary || colorOverrides.secondary || colorOverrides.background) && !selectedPaletteId && (
              <Button
                size="sm"
                variant="flat"
                className="mt-3 w-full"
                onPress={resetColors}
              >
                Reset to Original
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorField ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 font-mono text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
        />
      </div>
    </div>
  )
}
