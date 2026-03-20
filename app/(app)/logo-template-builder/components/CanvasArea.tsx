'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Stage, Layer, Rect, Circle, Line, Text, Group, Shape, Transformer, Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { useEditorStore } from '../store'
import type { EditorElement, RectElement, CircleElement, LineElement, TextElement, CurvedTextElement, SplitTextElement, IconPlaceholderElement, PresetIconElement, GroupElement } from '../types'
import { buildFontStyle } from '../hooks/useFonts'

const PADDING = 40 // workspace padding around artboard

/** In builder mode, color tokens like {color.primary} are unresolved.
 *  Show a neutral grey placeholder so shapes are visible. */
const TOKEN_PLACEHOLDER = '#a0a0a0'
function resolveBuilderColor (value: string | undefined): string | undefined {
  if (!value) return value
  return value.startsWith('{') ? TOKEN_PLACEHOLDER : value
}

function scaleGroupChildren (children: EditorElement[], scaleX: number, scaleY: number): EditorElement[] {
  return children.map(c => {
    const scaled = { ...c, x: c.x * scaleX, y: c.y * scaleY } as Record<string, unknown>
    if (c.type === 'rect' || c.type === 'icon_placeholder' || c.type === 'preset_icon') {
      scaled.width = Math.max(5, (c as RectElement).width * scaleX)
      scaled.height = Math.max(5, (c as RectElement).height * scaleY)
    } else if (c.type === 'circle') {
      scaled.radius = Math.max(5, (c as CircleElement).radius * Math.min(scaleX, scaleY))
    } else if (c.type === 'text') {
      scaled.width = Math.max(20, (c as TextElement).width * scaleX)
    } else if (c.type === 'curved_text') {
      scaled.radius = Math.max(10, (c as CurvedTextElement).radius * Math.min(scaleX, scaleY))
    } else if (c.type === 'split_text') {
      scaled.width = Math.max(20, (c as SplitTextElement).width * scaleX)
    } else if (c.type === 'line') {
      const pts = (c as LineElement).points
      scaled.points = [pts[0] * scaleX, pts[1] * scaleY, pts[2] * scaleX, pts[3] * scaleY]
    }
    return scaled as unknown as EditorElement
  })
}

export function CanvasArea () {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map())

  const { document: doc, selectedElementIds, setSelectedElementId, setSelectedElementIds, updateElement, deleteElement, duplicateElement, reorderElement, groupElements, ungroupElement } = useEditorStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)

  const selectedEl = selectedElementIds.length === 1
    ? doc.elements.find(e => e.id === selectedElementIds[0])
    : null
  const isAutoLayoutGroup = selectedEl?.type === 'group' && !!(selectedEl as GroupElement).layout

  // Attach transformer to all selected nodes
  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    const nodes = selectedElementIds
      .map(id => nodeRefs.current.get(id))
      .filter((n): n is Konva.Node => !!n)
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedElementIds, doc.elements])

  const stageWidth = doc.canvas.width + PADDING * 2
  const stageHeight = doc.canvas.height + PADDING * 2
  const artboardX = PADDING
  const artboardY = PADDING

  function handleStageClick (e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage() || e.target.name() === 'artboard-bg') {
      setSelectedElementId(null)
    }
  }

  function handleDragEnd (id: string, e: Konva.KonvaEventObject<DragEvent>) {
    const el = doc.elements.find(el => el.id === id)
    const group = el?.type === 'group' ? el as GroupElement : null
    const newX = e.target.x() - artboardX
    const newY = e.target.y() - artboardY
    updateElement(id, {
      x: group?.centerH ? el!.x : newX,
      y: group?.centerV ? el!.y : newY,
    } as Partial<EditorElement>)
    // Snap node back to constrained position visually
    if (group?.centerH) e.target.x(artboardX + el!.x)
    if (group?.centerV) e.target.y(artboardY + el!.y)
  }

  function handleTransformEnd (id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target
    const el = doc.elements.find(el => el.id === id)
    if (!el) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Normalize scale back to 1 and write real dimensions into state
    node.scaleX(1)
    node.scaleY(1)

    const patch: Partial<EditorElement> = {
      x: node.x() - artboardX,
      y: node.y() - artboardY,
      rotation: node.rotation()
    }

    if (el.type === 'rect' || el.type === 'icon_placeholder' || el.type === 'preset_icon') {
      ;(patch as Record<string, unknown>).width = Math.max(5, (el as RectElement).width * scaleX)
      ;(patch as Record<string, unknown>).height = Math.max(5, (el as RectElement).height * scaleY)
    } else if (el.type === 'circle') {
      ;(patch as Record<string, unknown>).radius = Math.max(5, (el as CircleElement).radius * scaleX)
    } else if (el.type === 'text') {
      ;(patch as Record<string, unknown>).width = Math.max(20, (el as TextElement).width * scaleX)
    } else if (el.type === 'split_text') {
      ;(patch as Record<string, unknown>).width = Math.max(20, (el as SplitTextElement).width * scaleX)
    } else if (el.type === 'curved_text') {
      ;(patch as Record<string, unknown>).radius = Math.max(10, (el as CurvedTextElement).radius * scaleX)
    } else if (el.type === 'line') {
      const pts = (el as LineElement).points
      ;(patch as Record<string, unknown>).points = [pts[0], pts[1], pts[2] * scaleX, pts[3] * scaleY]
    } else if (el.type === 'group') {
      // Distribute scale into children (skip for auto-layout groups — anchors disabled but defensive)
      if (!(el as GroupElement).layout) {
        ;(patch as Record<string, unknown>).children = scaleGroupChildren((el as GroupElement).children, scaleX, scaleY)
      }
    }

    updateElement(id, patch as Partial<EditorElement>)
  }

  const setNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      nodeRefs.current.set(id, node)
    } else {
      nodeRefs.current.delete(id)
    }
  }, [])

  function handleSelect (id: string, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true
    if (e.evt.shiftKey) {
      const ids = selectedElementIds.includes(id)
        ? selectedElementIds.filter(i => i !== id)
        : [...selectedElementIds, id]
      setSelectedElementIds(ids)
    } else {
      setSelectedElementId(id)
    }
  }

  function handleContextMenu (id: string, e: Konva.KonvaEventObject<PointerEvent>) {
    e.evt.preventDefault()
    e.cancelBubble = true
    // Keep multi-selection if right-clicking an already-selected element
    if (!selectedElementIds.includes(id)) {
      setSelectedElementId(id)
    }
    setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId: id })
  }

  function handleContextAction (key: React.Key) {
    if (!contextMenu) return
    const { elementId } = contextMenu
    const el = doc.elements.find(e => e.id === elementId)
    if (!el) return
    const idx = doc.elements.indexOf(el)

    switch (key) {
      case 'edit': setSelectedElementId(elementId); break
      case 'duplicate': duplicateElement(elementId); break
      case 'bring-forward': if (idx < doc.elements.length - 1) reorderElement(elementId, 'forward'); break
      case 'send-back': if (idx > 0) reorderElement(elementId, 'backward'); break
      case 'delete': deleteElement(elementId); break
      case 'group': groupElements(selectedElementIds); break
      case 'ungroup': ungroupElement(elementId); break
    }
    setContextMenu(null)
  }

  const contextEl = contextMenu ? doc.elements.find(e => e.id === contextMenu.elementId) : null
  const contextIdx = contextEl ? doc.elements.indexOf(contextEl) : -1
  const canGroup = selectedElementIds.length >= 2

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 0 0 / 20px 20px' }}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onClick={handleStageClick}
      >
        <Layer>
          {/* Artboard background */}
          <Rect
            name="artboard-bg"
            x={artboardX}
            y={artboardY}
            width={doc.canvas.width}
            height={doc.canvas.height}
            fill={resolveBuilderColor(doc.canvas.background)}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={12}
            shadowOffsetY={2}
            listening={true}
          />

          {/* Elements */}
          {doc.elements.map(el => (
            <ElementNode
              key={el.id}
              el={el}
              artboardX={artboardX}
              artboardY={artboardY}
              isSelected={selectedElementIds.includes(el.id)}
              onSelect={(e) => handleSelect(el.id, e)}
              onContextMenu={(e) => handleContextMenu(el.id, e)}
              onDragEnd={(e) => handleDragEnd(el.id, e)}
              onTransformEnd={(e) => handleTransformEnd(el.id, e)}
              setRef={(node) => setNodeRef(el.id, node)}
            />
          ))}

          {/* Per-element selection highlights (multi-select only) */}
          {selectedElementIds.length > 1 && selectedElementIds.map(id => {
            const el = doc.elements.find(e => e.id === id)
            if (!el || el.type === 'group') return null
            return (
              <SelectionHighlight
                key={`sh-${id}`}
                el={el}
                artboardX={artboardX}
                artboardY={artboardY}
              />
            )
          })}

          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            keepRatio={false}
            enabledAnchors={isAutoLayoutGroup
              ? []
              : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox
              return newBox
            }}
          />
        </Layer>
      </Stage>

      {/* Canvas right-click context menu */}
      {contextMenu && (
        <Dropdown
          isOpen
          onOpenChange={(open) => { if (!open) setContextMenu(null) }}
          placement="bottom-start"
        >
          <DropdownTrigger>
            <div
              style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 1, height: 1, pointerEvents: 'none' }}
            />
          </DropdownTrigger>
          <DropdownMenu aria-label="Element actions" onAction={handleContextAction}>
            <DropdownItem key="edit">Edit</DropdownItem>
            <DropdownItem key="duplicate">Duplicate</DropdownItem>
            <DropdownItem key="bring-forward" isDisabled={contextIdx === doc.elements.length - 1}>Bring Forward</DropdownItem>
            <DropdownItem key="send-back" isDisabled={contextIdx === 0}>Send Back</DropdownItem>
            {canGroup ? <DropdownItem key="group">Group</DropdownItem> : null}
            {contextEl?.type === 'group' ? <DropdownItem key="ungroup">Ungroup</DropdownItem> : null}
            <DropdownItem key="delete" color="danger" className="text-danger">Delete</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      )}
    </div>
  )
}

interface NodeProps {
  el: EditorElement
  artboardX: number
  artboardY: number
  isSelected: boolean
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void
  setRef: (node: Konva.Node | null) => void
}

function ElementNode ({ el, artboardX, artboardY, isSelected, onSelect, onContextMenu, onDragEnd, onTransformEnd, setRef }: NodeProps) {
  const commonProps = {
    x: artboardX + el.x,
    y: artboardY + el.y,
    rotation: el.rotation,
    draggable: el.draggable,
    onClick: onSelect,
    onContextMenu,
    onDragEnd,
    onTransformEnd
  }

  if (el.type === 'rect') {
    return (
      <Rect
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        width={el.width}
        height={el.height}
        fill={el.fill}
        stroke={isSelected ? undefined : el.stroke}
        strokeWidth={el.strokeWidth}
      />
    )
  }

  if (el.type === 'circle') {
    return (
      <Circle
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        radius={el.radius}
        fill={el.fill}
        stroke={isSelected ? undefined : el.stroke}
        strokeWidth={el.strokeWidth}
      />
    )
  }

  if (el.type === 'line') {
    return (
      <Line
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        points={el.points}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        hitStrokeWidth={12}
      />
    )
  }

  if (el.type === 'text') {
    return (
      <Text
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        text={el.text}
        width={el.width}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fontStyle={buildFontStyle(el.fontStyle, el.fontWeight)}
        fill={el.fill}
        align={el.align}
      />
    )
  }

  if (el.type === 'curved_text') {
    return (
      <CurvedTextNode
        el={el}
        commonProps={commonProps}
        setRef={setRef}
      />
    )
  }

  if (el.type === 'split_text') {
    return (
      <SplitTextNode
        el={el}
        commonProps={commonProps}
        setRef={setRef}
      />
    )
  }

  if (el.type === 'icon_placeholder') {
    return (
      <IconPlaceholderNode
        el={el}
        commonProps={commonProps}
        setRef={setRef}
      />
    )
  }

  if (el.type === 'preset_icon') {
    return (
      <PresetIconNode
        el={el}
        commonProps={commonProps}
        setRef={setRef}
      />
    )
  }

  if (el.type === 'group') {
    return (
      <Group
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
      >
        {(el as GroupElement).children.map(child => (
          <ElementNode
            key={child.id}
            el={{ ...child, draggable: false }}
            artboardX={0}
            artboardY={0}
            isSelected={false}
            onSelect={onSelect}
            onContextMenu={onContextMenu}
            onDragEnd={() => {}}
            onTransformEnd={() => {}}
            setRef={() => {}}
          />
        ))}
      </Group>
    )
  }

  return null
}

function SelectionHighlight ({ el, artboardX, artboardY }: {
  el: EditorElement
  artboardX: number
  artboardY: number
}) {
  const x = artboardX + el.x
  const y = artboardY + el.y
  const style = { stroke: '#006FEE', strokeWidth: 1.5, dash: [4, 3], listening: false, perfectDrawEnabled: false }

  if (el.type === 'rect' || el.type === 'icon_placeholder' || el.type === 'preset_icon') {
    const e = el as RectElement
    return <Rect x={x} y={y} width={e.width} height={e.height} rotation={el.rotation} {...style} />
  }
  if (el.type === 'circle') {
    return <Circle x={x} y={y} radius={(el as CircleElement).radius} rotation={el.rotation} {...style} />
  }
  if (el.type === 'text') {
    const e = el as TextElement
    return <Rect x={x} y={y} width={e.width} height={e.fontSize * 1.25} rotation={el.rotation} {...style} />
  }
  if (el.type === 'split_text') {
    const e = el as SplitTextElement
    return <Rect x={x} y={y} width={e.width} height={e.fontSize * 1.25} rotation={el.rotation} {...style} />
  }
  if (el.type === 'curved_text') {
    const r = (el as CurvedTextElement).radius + (el as CurvedTextElement).fontSize
    return <Rect x={x - r} y={y - r} width={r * 2} height={r * 2} rotation={el.rotation} {...style} />
  }
  if (el.type === 'line') {
    return <Line x={x} y={y} points={(el as LineElement).points} {...style} />
  }
  return null
}

function CurvedTextNode ({ el, commonProps, setRef }: {
  el: CurvedTextElement
  commonProps: Record<string, unknown>
  setRef: (node: Konva.Node | null) => void
}) {
  return (
    <Shape
      ref={(n) => setRef(n as Konva.Node | null)}
      {...commonProps}
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

        // Convert startAngle (0=top, clockwise) to canvas radians
        const centerRad = (startAngle - 90) * (Math.PI / 180)

        if (flipped) {
          // Bottom arc: traverse counterclockwise (decreasing angle) so text reads L→R
          let angle = centerRad + totalAngle / 2
          chars.forEach((char, i) => {
            const charAngle = charWidths[i] / radius
            const mid = angle - charAngle / 2
            ctx.save()
            ctx.translate(Math.cos(mid) * radius, Math.sin(mid) * radius)
            ctx.rotate(mid - Math.PI / 2) // tops point toward center
            ctx.fillText(char, 0, 0)
            ctx.restore()
            angle -= charAngle
          })
        } else {
          // Top arc: traverse clockwise (increasing angle) so text reads L→R
          let angle = centerRad - totalAngle / 2
          chars.forEach((char, i) => {
            const charAngle = charWidths[i] / radius
            const mid = angle + charAngle / 2
            ctx.save()
            ctx.translate(Math.cos(mid) * radius, Math.sin(mid) * radius)
            ctx.rotate(mid + Math.PI / 2) // tops point away from center
            ctx.fillText(char, 0, 0)
            ctx.restore()
            angle += charAngle
          })
        }
      }}
      hitFunc={(ctx, shape) => {
        // Hit area: a ring around the arc
        ctx.beginPath()
        ctx.arc(0, 0, el.radius + el.fontSize, 0, Math.PI * 2)
        ctx.arc(0, 0, Math.max(0, el.radius - el.fontSize), 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
    />
  )
}

function SplitTextNode ({ el, commonProps, setRef }: {
  el: SplitTextElement
  commonProps: Record<string, unknown>
  setRef: (node: Konva.Node | null) => void
}) {
  return (
    <Shape
      ref={(n) => setRef(n as Konva.Node | null)}
      {...commonProps}
      sceneFunc={(ctx, shape) => {
        ctx.save()
        ctx.textBaseline = 'alphabetic'

        // Measure both parts first
        const p1Weight = el.part1.fontWeight ?? 700
        const p1Style  = el.part1.fontStyle ?? 'normal'
        ctx.font = `${p1Style} ${p1Weight} ${el.fontSize}px "${el.fontFamily}"`
        const p1Width = ctx.measureText(el.part1.text).width

        const p2Weight = el.part2.fontWeight ?? 400
        const p2Style  = el.part2.fontStyle ?? 'normal'
        ctx.font = `${p2Style} ${p2Weight} ${el.fontSize}px "${el.fontFamily}"`
        const p2Width = ctx.measureText(el.part2.text).width

        const totalWidth = p1Width + p2Width
        const startX = el.align === 'center'
          ? (el.width - totalWidth) / 2
          : el.align === 'right'
            ? el.width - totalWidth
            : 0

        ctx.font = `${p1Style} ${p1Weight} ${el.fontSize}px "${el.fontFamily}"`
        ctx.fillStyle = resolveBuilderColor(el.part1.fill ?? el.fill) ?? el.fill
        ctx.fillText(el.part1.text, startX, 0)

        ctx.font = `${p2Style} ${p2Weight} ${el.fontSize}px "${el.fontFamily}"`
        ctx.fillStyle = resolveBuilderColor(el.part2.fill ?? el.fill) ?? el.fill
        ctx.fillText(el.part2.text, startX + p1Width, 0)

        ctx.restore()
        shape.setAttr('width', totalWidth)
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.rect(0, -el.fontSize, shape.getAttr('width') ?? el.width, el.fontSize * 1.4)
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
    />
  )
}

function useKonvaImage (url: string | undefined, width?: number, height?: number): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!url) { setImg(null); return }
    let cancelled = false
    let blobUrl: string | null = null
    const isSvg = url.includes('.svg')
    const dpr = window.devicePixelRatio ?? 2
    const px = width ? Math.round(width * dpr) : undefined
    const py = height ? Math.round(height * dpr) : undefined

    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`

    fetch(isSvg && px && py ? `${proxyUrl}&w=${px}&h=${py}` : proxyUrl)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        const image = new window.Image()
        image.onload = () => { if (!cancelled) setImg(image) }
        image.onerror = () => { if (!cancelled) setImg(null) }
        image.src = blobUrl
      })
      .catch(() => { if (!cancelled) setImg(null) })

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url, width, height])
  return img
}

function PresetIconNode ({ el, commonProps, setRef }: {
  el: PresetIconElement
  commonProps: Record<string, unknown>
  setRef: (node: Konva.Node | null) => void
}) {
  const img = useKonvaImage(el.iconUrl || undefined, el.width, el.height)

  if (img) {
    return (
      <KonvaImage
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        image={img}
        width={el.width}
        height={el.height}
      />
    )
  }

  return (
    <Group
      ref={(n) => setRef(n as Konva.Node | null)}
      {...commonProps}
    >
      <Rect
        width={el.width}
        height={el.height}
        stroke="#999999"
        strokeWidth={1}
        dash={[6, 4]}
        fill="rgba(0,0,0,0.03)"
      />
      <Text
        x={0}
        y={el.height / 2 - 8}
        width={el.width}
        text="Preset Icon"
        fontSize={11}
        fontFamily="monospace"
        fill="#999999"
        align="center"
      />
    </Group>
  )
}

function IconPlaceholderNode ({ el, commonProps, setRef }: {
  el: IconPlaceholderElement
  commonProps: Record<string, unknown>
  setRef: (node: Konva.Node | null) => void
}) {
  const img = useKonvaImage(el.iconPreviewUrl, el.width, el.height)

  if (img) {
    return (
      <KonvaImage
        ref={(n) => setRef(n as Konva.Node | null)}
        {...commonProps}
        image={img}
        width={el.width}
        height={el.height}
      />
    )
  }

  return (
    <Group
      ref={(n) => setRef(n as Konva.Node | null)}
      {...commonProps}
    >
      {/* Dashed border placeholder */}
      <Rect
        width={el.width}
        height={el.height}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        dash={[6, 4]}
        fill="rgba(0,0,0,0.03)"
      />
      <Line points={[0, 0, el.width, el.height]} stroke={el.stroke} strokeWidth={1} opacity={0.4} />
      <Line points={[el.width, 0, 0, el.height]} stroke={el.stroke} strokeWidth={1} opacity={0.4} />
      <Text
        x={0}
        y={el.height / 2 - 8}
        width={el.width}
        text={el.bind ? `${el.label}\n${el.bind}` : el.label}
        fontSize={11}
        fontFamily="monospace"
        fill={el.stroke}
        align="center"
      />
    </Group>
  )
}
