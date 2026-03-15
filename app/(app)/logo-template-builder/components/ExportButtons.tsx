'use client'

import { Button, ButtonGroup } from '@heroui/react'

interface ExportButtonsProps {
  onExportPng: () => void
  onExportJpeg: () => void
  onExportSvg: () => void
  disabled?: boolean
}

export function ExportButtons ({ onExportPng, onExportJpeg, onExportSvg, disabled }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <span className="text-xs text-zinc-500 mr-1">Export:</span>
      <ButtonGroup size="sm" variant="flat" isDisabled={disabled}>
        <Button onPress={onExportPng}>PNG</Button>
        <Button onPress={onExportJpeg}>JPEG</Button>
        <Button onPress={onExportSvg}>SVG</Button>
      </ButtonGroup>
    </div>
  )
}
