'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Breadcrumbs, BreadcrumbItem, Chip, Spinner } from '@heroui/react'
import { api } from '@/lib/api/client'
import type { DesignRequest, DesignProject } from '@/lib/api/client'

const ICON_S3_BASE = 'https://terrano-ai.s3.us-east-1.amazonaws.com'
import type { TemplateDocument } from '@/app/(app)/logo-template-builder/types'
import type { PreviewVariables } from '@/app/(app)/logo-template-builder/previewTypes'
import { resolveTemplateDocument } from '@/app/(app)/logo-template-builder/lib/resolveTemplateDocument'
import { useFonts } from '@/app/(app)/logo-template-builder/hooks/useFonts'

const PreviewCanvas = dynamic(
  () => import('@/app/(app)/logo-template-builder/components/PreviewCanvas').then(m => m.PreviewCanvas),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-xs text-zinc-400">Loading…</div> }
)

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

/** Map flat project variables to the nested PreviewVariables shape */
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

function ProjectCard ({ project, fontsReady, requestId }: { project: DesignProject; fontsReady: boolean; requestId: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setContainerWidth(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const page = project.pages.find(p => p.is_current) ?? project.pages[0]
  if (!page) return null

  const doc = page.page_json as unknown as TemplateDocument
  const previewVars = toPreviewVariables(project.variables)
  const resolvedDoc = resolveTemplateDocument(doc, previewVars)

  const artboardW = resolvedDoc.canvas.width
  const artboardH = resolvedDoc.canvas.height
  const canvasW = artboardW + CANVAS_PADDING * 2
  const canvasH = artboardH + CANVAS_PADDING * 2
  const scale = containerWidth > 0 ? containerWidth / artboardW : 0
  const offset = -(CANVAS_PADDING * scale)

  return (
    <a
      href={`/design/requests/${requestId}/projects/${project.id}`}
      className="block overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
    >
      {/* Canvas preview — full width, square aspect ratio, artboard fills edge to edge */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: `${artboardW} / ${artboardH}` }}
      >
        {scale > 0 && (
          <div style={{ position: 'absolute', top: offset, left: offset, transform: `scale(${scale})`, transformOrigin: '0 0', width: canvasW, height: canvasH }}>
            {/* key changes when fonts are ready, forcing a remount so Konva
                re-measures text with the real font instead of the fallback */}
            <PreviewCanvas key={String(fontsReady)} doc={resolvedDoc} variables={previewVars} />
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{project.title}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {project.variables['color.primary'] && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-200 dark:border-zinc-600"
              style={{ backgroundColor: project.variables['color.primary'] }}
              title={project.variables['color.primary']}
            />
          )}
          {project.variables['color.secondary'] && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-200 dark:border-zinc-600"
              style={{ backgroundColor: project.variables['color.secondary'] }}
              title={project.variables['color.secondary']}
            />
          )}
          {project.variables['text.tagline'] && (
            <span className="truncate text-xs text-zinc-400">{project.variables['text.tagline']}</span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function DesignRequestDetailPage () {
  const { id } = useParams<{ id: string }>()
  const { ready: fontsReady } = useFonts()
  const [request, setRequest] = useState<DesignRequest | null>(null)
  const [projects, setProjects] = useState<DesignProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getDesignRequest(id),
      api.getDesignRequestProjects(id),
    ]).then(([reqRes, projRes]) => {
      setRequest(reqRes.data)
      setProjects((projRes.data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order))
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!request) {
    return <p className="text-sm text-zinc-500">Request not found.</p>
  }

  const businessName = request.input_data?.business_name ?? 'Design Request'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1">
          <Breadcrumbs>
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem href="/design/requests">Requests</BreadcrumbItem>
            <BreadcrumbItem>{businessName}</BreadcrumbItem>
          </Breadcrumbs>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{businessName}</h1>
          {request.input_data?.business_context_raw && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {request.input_data.business_context_raw}
            </p>
          )}
        </div>
        <Chip color={STATUS_COLOR[request.status] ?? 'default'} variant="flat">
          {request.status.replace('_', ' ')}
        </Chip>
      </div>

      {/* Scope answers */}
      {request.input_data?.scope_answers && Object.keys(request.input_data.scope_answers).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(request.input_data.scope_answers).map(([k, v]) => (
            <Chip key={k} size="sm" variant="flat" color="default">
              <span className="text-zinc-500">{k.replace(/_/g, ' ')}:</span>&nbsp;{v}
            </Chip>
          ))}
        </div>
      )}

      {/* Projects grid */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {projects.length} project{projects.length !== 1 ? 's' : ''} generated
        </h2>

        {projects.length === 0 ? (
          <p className="text-sm text-zinc-400">No projects generated yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} fontsReady={fontsReady} requestId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
