'use client'

import { useState } from 'react'
import { Select, SelectItem, Button } from '@heroui/react'
import type { PreviewVariables } from '../previewTypes'
import { useFonts } from '../hooks/useFonts'
import { IconPickerModal } from './IconPickerModal'
import { designIconUrl } from '@/lib/api/client'
import type { DesignIcon } from '@/lib/api/client'

interface PreviewPanelProps {
  variables: PreviewVariables
  onChange: (patch: Partial<PreviewVariables>) => void
}

export function PreviewPanel ({ variables, onChange }: PreviewPanelProps) {
  const { fonts } = useFonts()
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  function handleIconSelect (icon: DesignIcon) {
    onChange({
      icon: {
        primaryId: icon.id,
        primaryUrl: designIconUrl(icon),
        primaryName: icon.name,
      }
    })
  }

  return (
    <div className="overflow-y-auto p-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Preview Variables</p>

      <div className="space-y-3">
        <Field label="Wordmark">
          <TextInput
            value={variables.text.wordmark}
            onChange={v => onChange({ text: { ...variables.text, wordmark: v } })}
            placeholder="Company name"
          />
        </Field>

        <Field label="Tagline">
          <TextInput
            value={variables.text.tagline ?? ''}
            onChange={v => onChange({ text: { ...variables.text, tagline: v } })}
            placeholder="Tagline (optional)"
          />
        </Field>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />

        <Field label="Icon">
          <div className="flex items-center gap-2">
            {variables.icon.primaryUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={variables.icon.primaryUrl}
                alt={variables.icon.primaryName ?? 'icon'}
                className="h-8 w-8 flex-shrink-0 object-contain dark:invert"
              />
            )}
            <Button
              size="sm"
              variant="flat"
              className="flex-1"
              onPress={() => setIconPickerOpen(true)}
            >
              {variables.icon.primaryName ?? 'Pick Icon…'}
            </Button>
          </div>
          <IconPickerModal
            isOpen={iconPickerOpen}
            onClose={() => setIconPickerOpen(false)}
            onSelect={handleIconSelect}
          />
        </Field>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />

        <Field label="Primary Color">
          <ColorInput
            value={variables.color.primary}
            onChange={v => onChange({ color: { ...variables.color, primary: v } })}
          />
        </Field>

        <Field label="Secondary Color">
          <ColorInput
            value={variables.color.secondary ?? '#ffffff'}
            onChange={v => onChange({ color: { ...variables.color, secondary: v } })}
          />
        </Field>

        <Field label="Background Color">
          <ColorInput
            value={variables.color.background ?? '#ffffff'}
            onChange={v => onChange({ color: { ...variables.color, background: v } })}
          />
        </Field>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-700" />

        <Field label="Font">
          <Select
            size="sm"
            aria-label="Font"
            isLoading={fonts.length === 0}
            selectedKeys={fonts.length > 0 ? [variables.font.primary] : []}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as string
              if (val) onChange({ font: { primary: val } })
            }}
          >
            {fonts.map(f => (
              <SelectItem key={f.family}>{f.family}</SelectItem>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  )
}

function TextInput ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-200 bg-transparent px-2 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-zinc-600 dark:text-zinc-100"
    />
  )
}

function ColorInput ({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
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
  )
}
