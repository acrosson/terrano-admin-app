'use client'

import { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Group, Path, Shape, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import type { TemplateDocument, EditorElement, CurvedTextElement, SplitTextElement, IconPlaceholderElement, PresetIconElement, GroupElement } from '../types'
import type { PreviewVariables } from '../previewTypes'
import { buildFontStyle } from '../hooks/useFonts'

const PADDING = 40

/** Shrink fontSize until the text fits within maxWidth. Uses a hidden canvas for measurement. */
function fitFontSize (text: string, fontFamily: string, fontStyle: string, maxWidth: number, fontSize: number): number {
  if (!text || maxWidth <= 0) return fontSize
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  let size = fontSize
  ctx.font = `${fontStyle} ${size}px ${fontFamily}`
  while (ctx.measureText(text).width > maxWidth && size > 8) {
    size -= 1
    ctx.font = `${fontStyle} ${size}px ${fontFamily}`
  }
  return size
}

interface PreviewCanvasProps {
  doc: TemplateDocument
  variables: PreviewVariables
  onStageMount?: (stage: Konva.Stage) => void
  onBgRectMount?: (node: Konva.Rect) => void
}

export function PreviewCanvas ({ doc, variables, onStageMount, onBgRectMount }: PreviewCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)

  useEffect(() => {
    if (stageRef.current && onStageMount) {
      onStageMount(stageRef.current)
    }
  }, [onStageMount])

  const stageWidth = doc.canvas.width + PADDING * 2
  const stageHeight = doc.canvas.height + PADDING * 2
  const artboardX = PADDING
  const artboardY = PADDING

  return (
    <div
      className="overflow-auto"
      style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 0 0 / 20px 20px' }}
    >
      <Stage ref={stageRef} width={stageWidth} height={stageHeight}>
        <Layer>
          {/* Artboard background */}
          <Rect
            ref={node => { if (node && onBgRectMount) onBgRectMount(node) }}
            x={artboardX}
            y={artboardY}
            width={doc.canvas.width}
            height={doc.canvas.height}
            fill={doc.canvas.background}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={12}
            shadowOffsetY={2}
            listening={false}
          />

          {/* Elements — read-only, no drag, no selection */}
          {doc.elements.map(el => (
            <PreviewElementNode
              key={el.id}
              el={el}
              artboardX={artboardX}
              artboardY={artboardY}
              variables={variables}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}

interface PreviewNodeProps {
  el: EditorElement
  artboardX: number
  artboardY: number
  variables: PreviewVariables
}

function PreviewElementNode ({ el, artboardX, artboardY, variables }: PreviewNodeProps) {
  const baseX = artboardX + el.x
  const baseY = artboardY + el.y

  if (el.type === 'rect') {
    return (
      <Rect
        x={baseX} y={baseY}
        width={el.width} height={el.height}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  if (el.type === 'circle') {
    return (
      <Circle
        x={baseX} y={baseY}
        radius={el.radius}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  if (el.type === 'line') {
    return (
      <Line
        x={baseX} y={baseY}
        points={el.points}
        stroke={el.stroke} strokeWidth={el.strokeWidth}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  if (el.type === 'text') {
    const fontStyle = buildFontStyle(el.fontStyle, el.fontWeight)
    const fontSize = fitFontSize(el.text, el.fontFamily, fontStyle, el.width, el.fontSize)
    return (
      <Text
        x={baseX} y={baseY}
        text={el.text}
        width={el.width}
        fontSize={fontSize}
        fontFamily={el.fontFamily}
        fontStyle={fontStyle}
        fill={el.fill}
        align={el.align}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  if (el.type === 'curved_text') {
    return <PreviewCurvedText el={el} artboardX={artboardX} artboardY={artboardY} />
  }

  if (el.type === 'split_text') {
    return <PreviewSplitText el={el} artboardX={artboardX} artboardY={artboardY} />
  }

  if (el.type === 'icon_placeholder') {
    return (
      <PreviewIconNode
        el={el}
        artboardX={artboardX}
        artboardY={artboardY}
        variables={variables}
      />
    )
  }

  if (el.type === 'preset_icon') {
    return (
      <PreviewPresetIconNode
        el={el}
        artboardX={artboardX}
        artboardY={artboardY}
      />
    )
  }

  if (el.type === 'group') {
    return (
      <Group x={baseX} y={baseY} rotation={el.rotation} listening={false}>
        {(el as GroupElement).children.map(child => (
          <PreviewElementNode
            key={child.id}
            el={child}
            artboardX={0}
            artboardY={0}
            variables={variables}
          />
        ))}
      </Group>
    )
  }

  return null
}

function PreviewCurvedText ({ el, artboardX, artboardY }: { el: CurvedTextElement; artboardX: number; artboardY: number }) {
  return (
    <Shape
      x={artboardX + el.x}
      y={artboardY + el.y}
      rotation={el.rotation}
      listening={false}
      sceneFunc={(ctx) => {
        const { text, radius, startAngle, fontSize, fontFamily, fill, flipped, fontStyle, fontWeight } = el

        ctx.font = `${buildFontStyle(fontStyle, fontWeight)} ${fontSize}px ${fontFamily}`
        ctx.fillStyle = fill
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const chars = text.split('')
        const charWidths = chars.map(c => Math.max(ctx.measureText(c).width, 1))
        const totalWidth = charWidths.reduce((a, b) => a + b, 0)
        const totalAngle = totalWidth / radius
        const centerRad = (startAngle - 90) * (Math.PI / 180)

        if (flipped) {
          let angle = centerRad + totalAngle / 2
          chars.forEach((char, i) => {
            const charAngle = charWidths[i] / radius
            const mid = angle - charAngle / 2
            ctx.save()
            ctx.translate(Math.cos(mid) * radius, Math.sin(mid) * radius)
            ctx.rotate(mid - Math.PI / 2)
            ctx.fillText(char, 0, 0)
            ctx.restore()
            angle -= charAngle
          })
        } else {
          let angle = centerRad - totalAngle / 2
          chars.forEach((char, i) => {
            const charAngle = charWidths[i] / radius
            const mid = angle + charAngle / 2
            ctx.save()
            ctx.translate(Math.cos(mid) * radius, Math.sin(mid) * radius)
            ctx.rotate(mid + Math.PI / 2)
            ctx.fillText(char, 0, 0)
            ctx.restore()
            angle += charAngle
          })
        }
      }}
    />
  )
}

function PreviewSplitText ({ el, artboardX, artboardY }: { el: SplitTextElement; artboardX: number; artboardY: number }) {
  return (
    <Shape
      x={artboardX + el.x}
      y={artboardY + el.y}
      rotation={el.rotation}
      listening={false}
      sceneFunc={(ctx) => {
        ctx.save()
        ctx.textBaseline = 'alphabetic'

        // Measure both parts first
        const p1Weight = el.part1.fontWeight ?? 700
        const p1Style  = el.part1.fontStyle ?? 'normal'
        ctx.font = `${buildFontStyle(p1Style, p1Weight)} ${el.fontSize}px "${el.fontFamily}"`
        const p1Width = ctx.measureText(el.part1.text).width

        const p2Weight = el.part2.fontWeight ?? 400
        const p2Style  = el.part2.fontStyle ?? 'normal'
        ctx.font = `${buildFontStyle(p2Style, p2Weight)} ${el.fontSize}px "${el.fontFamily}"`
        const p2Width = ctx.measureText(el.part2.text).width

        const totalWidth = p1Width + p2Width
        const startX = el.align === 'center'
          ? (el.width - totalWidth) / 2
          : el.align === 'right'
            ? el.width - totalWidth
            : 0

        ctx.font = `${buildFontStyle(p1Style, p1Weight)} ${el.fontSize}px "${el.fontFamily}"`
        ctx.fillStyle = el.part1.fill ?? el.fill
        ctx.fillText(el.part1.text, startX, 0)

        ctx.font = `${buildFontStyle(p2Style, p2Weight)} ${el.fontSize}px "${el.fontFamily}"`
        ctx.fillStyle = el.part2.fill ?? el.fill
        ctx.fillText(el.part2.text, startX + p1Width, 0)

        ctx.restore()
      }}
    />
  )
}

function useCanvgIcon (
  url: string | undefined,
  width: number,
  height: number,
  color: string | undefined
): HTMLCanvasElement | null {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!url) { setCanvas(null); return }
    let cancelled = false
    const dpr = window.devicePixelRatio ?? 2
    const pw = Math.round(width * dpr)
    const ph = Math.round(height * dpr)

    async function render () {
      try {
        const { Canvg } = await import('canvg')
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url!)}`
        const svgText = await fetch(proxyUrl).then(r => r.text())
        if (cancelled) return

        // Optionally colorize by replacing currentColor / stroke / fill
        const colorized = color
          ? svgText
              .replace(/currentColor/g, color)
              .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
              .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
          : svgText

        const offscreen = document.createElement('canvas')
        offscreen.width = pw
        offscreen.height = ph
        const ctx = offscreen.getContext('2d')!
        const v = await Canvg.fromString(ctx, colorized, {
          ignoreMouse: true,
          ignoreAnimation: true,
        })
        v.resize(pw, ph, 'xMidYMid meet')
        await v.render()
        if (!cancelled) setCanvas(offscreen)
      } catch {
        if (!cancelled) setCanvas(null)
      }
    }

    void render()
    return () => { cancelled = true }
  }, [url, width, height, color])
  return canvas
}

function PreviewIconNode ({
  el,
  artboardX,
  artboardY,
  variables,
}: {
  el: IconPlaceholderElement
  artboardX: number
  artboardY: number
  variables: PreviewVariables
}) {
  // Resolve icon URL from bind — e.g. bind "icon.custom_brandmark" → variables.icon.custom_brandmarkUrl
  const bindKey = el.bind?.split('.')[1]  // e.g. "primary", "custom_brandmark"
  const resolvedUrl = (bindKey ? (variables.icon as Record<string, string | undefined>)[`${bindKey}Url`] : undefined) ?? el.iconPreviewUrl
  const canvas = useCanvgIcon(resolvedUrl, el.width, el.height, el.iconColor)

  if (canvas) {
    return (
      <KonvaImage
        x={artboardX + el.x}
        y={artboardY + el.y}
        image={canvas}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  // No icon selected — render placeholder box
  return (
    <Group x={artboardX + el.x} y={artboardY + el.y} rotation={el.rotation} listening={false}>
      <Rect width={el.width} height={el.height} stroke="#aaaaaa" strokeWidth={1} dash={[6, 4]} fill="rgba(0,0,0,0.03)" />
    </Group>
  )
}

function PreviewPresetIconNode ({
  el,
  artboardX,
  artboardY,
}: {
  el: PresetIconElement
  artboardX: number
  artboardY: number
}) {
  const canvas = useCanvgIcon(el.iconUrl || undefined, el.width, el.height, el.iconColor)

  if (canvas) {
    return (
      <KonvaImage
        x={artboardX + el.x}
        y={artboardY + el.y}
        image={canvas}
        width={el.width}
        height={el.height}
        rotation={el.rotation}
        listening={false}
      />
    )
  }

  return (
    <Group x={artboardX + el.x} y={artboardY + el.y} rotation={el.rotation} listening={false}>
      <Rect width={el.width} height={el.height} stroke="#999999" strokeWidth={1} dash={[6, 4]} fill="rgba(0,0,0,0.03)" />
    </Group>
  )
}
