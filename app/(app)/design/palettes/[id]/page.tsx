'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Breadcrumbs,
  BreadcrumbItem,
  Button,
  Input,
  Select,
  SelectItem,
  Switch,
  Chip,
  Spinner,
  Card,
  CardBody,
  Divider,
} from '@heroui/react'
import { addToast } from '@heroui/toast'
import { api } from '@/lib/api/client'
import type { ColorPalette, PaletteTheme } from '@/lib/api/client'

const THEMES: PaletteTheme[] = ['LIGHT', 'DARK', 'VIBRANT']

function slugify (name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function ColorField ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
        />
        <Input size="sm" value={value} onValueChange={onChange} classNames={{ input: 'font-mono' }} />
      </div>
    </div>
  )
}

function TagInput ({
  label,
  tags,
  onChange,
  suggestions,
}: {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
}) {
  const [input, setInput] = useState('')

  function addTag (value?: string) {
    const tag = (value ?? input).trim().toLowerCase()
    if (!tag || tags.includes(tag)) { setInput(''); return }
    onChange([...tags, tag])
    setInput('')
  }

  function removeTag (tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  const unusedSuggestions = suggestions?.filter(s => !tags.includes(s))

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {tags.map(tag => (
          <Chip key={tag} size="sm" variant="flat" onClose={() => removeTag(tag)}>
            {tag}
          </Chip>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          size="sm"
          placeholder="Add tag..."
          value={input}
          onValueChange={setInput}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
        />
        <Button size="sm" variant="flat" onPress={() => addTag()}>Add</Button>
      </div>
      {unusedSuggestions && unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map(s => (
            <button
              key={s}
              onClick={() => addTag(s)}
              className="rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-500 dark:hover:border-zinc-400 dark:hover:text-zinc-300 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PalettePreviewCard ({ background, primary, secondary }: { background: string; primary: string; secondary: string }) {
  return (
    <div
      className="flex h-20 w-full items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 gap-4 px-6"
      style={{ backgroundColor: background }}
    >
      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: primary }} />
      <div
        className="h-5 rounded font-semibold px-3 flex items-center text-sm"
        style={{ backgroundColor: primary, color: background }}
      >
        Aa
      </div>
      <div className="h-5 rounded px-3 flex items-center text-sm" style={{ color: secondary }}>
        Secondary
      </div>
    </div>
  )
}

export default function PaletteEditorPage ({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [palette, setPalette] = useState<ColorPalette | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [background, setBackground] = useState('#000000')
  const [primary, setPrimary] = useState('#ffffff')
  const [secondary, setSecondary] = useState('#cccccc')
  const [colorTags, setColorTags] = useState<string[]>([])
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [theme, setTheme] = useState<PaletteTheme>('DARK')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    api.getColorPalette(id)
      .then(res => {
        const p = res.data
        if (!p) return
        setPalette(p)
        setName(p.name)
        setBackground(p.background)
        setPrimary(p.primary)
        setSecondary(p.secondary)
        setColorTags(p.color_tags)
        setMoodTags(p.mood_tags)
        setTheme(p.theme)
        setIsActive(p.is_active)
      })
      .catch(() => addToast({ title: 'Failed to load palette', color: 'danger' }))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave () {
    setSaving(true)
    try {
      await api.updateColorPalette(id, {
        name: name.trim(),
        slug: slugify(name),
        background,
        primary,
        secondary,
        color_tags: colorTags,
        mood_tags: moodTags,
        theme,
        is_active: isActive,
      })
      addToast({ title: 'Palette saved', color: 'success' })
    } catch {
      addToast({ title: 'Failed to save palette', color: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!palette) {
    return <p className="text-zinc-500">Palette not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs>
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem href="/design/palettes">Palettes</BreadcrumbItem>
            <BreadcrumbItem>{palette.name}</BreadcrumbItem>
          </Breadcrumbs>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{palette.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Edit palette colors and tags</p>
        </div>
        <Button color="primary" isLoading={saving} onPress={handleSave}>
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card shadow="sm" className="border border-zinc-200 dark:border-zinc-700">
          <CardBody className="space-y-5 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Colors</p>

            <PalettePreviewCard background={background} primary={primary} secondary={secondary} />

            <Divider />

            <Input
              label="Name"
              value={name}
              onValueChange={setName}
              isRequired
            />

            <ColorField label="Background" value={background} onChange={setBackground} />
            <ColorField label="Primary" value={primary} onChange={setPrimary} />
            <ColorField label="Secondary" value={secondary} onChange={setSecondary} />

            <Select
              label="Theme"
              selectedKeys={[theme]}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0] as PaletteTheme
                if (val) setTheme(val)
              }}
            >
              {THEMES.map(t => (
                <SelectItem key={t}>{t.toLowerCase()}</SelectItem>
              ))}
            </Select>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Active</span>
              <Switch isSelected={isActive} onValueChange={setIsActive} size="sm" />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm" className="border border-zinc-200 dark:border-zinc-700">
          <CardBody className="space-y-5 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Tags</p>
            <TagInput label="Color Tags" tags={colorTags} onChange={setColorTags} />
            <Divider />
            <TagInput
              label="Mood Tags"
              tags={moodTags}
              onChange={setMoodTags}
              suggestions={['trust', 'innovation', 'luxury', 'approachable', 'energetic', 'professional', 'creative', 'reliable', 'bold', 'calm']}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
