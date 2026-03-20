'use client'

import type Konva from 'konva'
import type { TemplateDocument } from '../types'
import { exportDocumentToSvg } from '../lib/exportToSvg'
import { SAMPLE_ICONS } from '../data/sampleIcons'

function triggerDownload (url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

function trimTransparent (dataUrl: string, fallbackFilename: string, outFilename: string) {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height)
    let minX = width, minY = height, maxX = 0, maxY = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3]
        if (alpha > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      triggerDownload(dataUrl, fallbackFilename)
      return
    }

    const cropW = maxX - minX + 1
    const cropH = maxY - minY + 1
    const cropped = document.createElement('canvas')
    cropped.width = cropW
    cropped.height = cropH
    cropped.getContext('2d')!.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
    triggerDownload(cropped.toDataURL('image/png'), outFilename)
  }
  img.src = dataUrl
}

interface UseCanvasExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  doc: TemplateDocument
  padding: number
  filename: string                                    // base name without extension
  iconVariables?: Record<string, string | undefined>
  bgRectRef?: React.RefObject<Konva.Rect | null>     // optional: enables transparent bg + trim on PNG export
}

export function useCanvasExport ({ stageRef, doc, padding, filename, iconVariables = {}, bgRectRef }: UseCanvasExportOptions) {
  function exportPng () {
    const stage = stageRef.current
    if (!stage) return

    const bg = bgRectRef?.current ?? null
    const resolvedBg = doc.canvas.background.toLowerCase().trim()
    const isWhite = resolvedBg === '#ffffff' || resolvedBg === '#fff' || resolvedBg === 'white'

    if (bg && isWhite) bg.fill('transparent')
    const dataUrl = stage.toDataURL({
      x: padding,
      y: padding,
      width: doc.canvas.width,
      height: doc.canvas.height,
      pixelRatio: 2,
    })
    if (bg && isWhite) bg.fill(doc.canvas.background)

    if (!isWhite || !bg) {
      triggerDownload(dataUrl, `${filename}.png`)
      return
    }

    trimTransparent(dataUrl, `${filename}.png`, `${filename}.png`)
  }

  function exportJpeg () {
    const stage = stageRef.current
    if (!stage) return
    const canvas = document.createElement('canvas')
    canvas.width = doc.canvas.width * 2
    canvas.height = doc.canvas.height * 2
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const pngUrl = stage.toDataURL({
      x: padding,
      y: padding,
      width: doc.canvas.width,
      height: doc.canvas.height,
      pixelRatio: 2,
    })
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      triggerDownload(canvas.toDataURL('image/jpeg', 0.92), `${filename}.jpg`)
    }
    img.src = pngUrl
  }

  function exportSvg () {
    const svgString = exportDocumentToSvg(doc, SAMPLE_ICONS, iconVariables)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    triggerDownload(URL.createObjectURL(blob), `${filename}.svg`)
  }

  return { exportPng, exportJpeg, exportSvg }
}
