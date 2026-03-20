'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Breadcrumbs,
  BreadcrumbItem,
  Button,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from '@heroui/react'
import { addToast } from '@heroui/toast'
import { api } from '@/lib/api/client'
import type { ColorPalette, PaletteTheme } from '@/lib/api/client'

const THEMES: PaletteTheme[] = ['LIGHT', 'DARK', 'VIBRANT']

function slugify (name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeColor (value: string): string {
  const v = value.trim()
  if (!v) return v
  return v.startsWith('#') ? v : `#${v}`
}

function ColorSwatch ({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded-sm border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

function PalettePreview ({ palette }: { palette: ColorPalette }) {
  return (
    <div className="flex items-center gap-1">
      <ColorSwatch color={palette.background} />
      <ColorSwatch color={palette.primary} />
      <ColorSwatch color={palette.secondary} />
    </div>
  )
}

export default function PalettesPage () {
  const router = useRouter()
  const [palettes, setPalettes] = useState<ColorPalette[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // New palette form
  const [name, setName] = useState('')
  const [background, setBackground] = useState('#000000')
  const [primary, setPrimary] = useState('#ffffff')
  const [secondary, setSecondary] = useState('#cccccc')
  const [theme, setTheme] = useState<PaletteTheme>('DARK')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.getColorPalettes()
      .then(res => setPalettes(res.data ?? []))
      .catch(() => addToast({ title: 'Failed to load palettes', color: 'danger' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate () {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await api.createColorPalette({
        name: name.trim(),
        slug: slugify(name),
        background,
        primary,
        secondary,
        color_tags: [],
        mood_tags: [],
        theme,
        is_active: true,
      })
      if (res.data) {
        addToast({ title: 'Palette created', color: 'success' })
        router.push(`/design/palettes/${res.data.id}`)
      }
    } catch {
      addToast({ title: 'Failed to create palette', color: 'danger' })
      setCreating(false)
    }
  }

  async function handleDelete (palette: ColorPalette) {
    if (!window.confirm(`Delete "${palette.name}"? This cannot be undone.`)) return
    try {
      await api.deleteColorPalette(palette.id)
      addToast({ title: 'Palette deleted', color: 'success' })
      load()
    } catch {
      addToast({ title: 'Failed to delete palette', color: 'danger' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs>
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem>Palettes</BreadcrumbItem>
          </Breadcrumbs>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Color Palettes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage color palettes used in logo generation</p>
        </div>
        <Button color="primary" onPress={() => setModalOpen(true)}>
          New Palette
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <Table aria-label="Color palettes" selectionMode="none">
          <TableHeader>
            <TableColumn className="w-20">Preview</TableColumn>
            <TableColumn>Name</TableColumn>
            <TableColumn>Theme</TableColumn>
            <TableColumn>Tags</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Created</TableColumn>
            <TableColumn className="w-10"> </TableColumn>
          </TableHeader>
          <TableBody emptyContent="No palettes yet. Create one to get started.">
            {palettes.map(palette => (
              <TableRow
                key={palette.id}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => router.push(`/design/palettes/${palette.id}`)}
              >
                <TableCell>
                  <PalettePreview palette={palette} />
                </TableCell>
                <TableCell className="font-medium">{palette.name}</TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" color={
                    palette.theme === 'DARK' ? 'default' : palette.theme === 'VIBRANT' ? 'secondary' : 'primary'
                  }>
                    {palette.theme.toLowerCase()}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {palette.color_tags.slice(0, 3).map(tag => (
                      <Chip key={tag} size="sm" variant="flat">{tag}</Chip>
                    ))}
                    {palette.color_tags.length > 3 && (
                      <Chip size="sm" variant="flat" color="default">
                        +{palette.color_tags.length - 3} more
                      </Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={palette.is_active ? 'success' : 'default'}
                    variant="flat"
                  >
                    {palette.is_active ? 'Active' : 'Draft'}
                  </Chip>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {new Date(palette.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light" aria-label="Actions">
                        <span className="text-lg leading-none">⋯</span>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Palette actions">
                      <DropdownItem
                        key="delete"
                        color="danger"
                        className="text-danger"
                        onPress={() => handleDelete(palette)}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          <ModalHeader>New Palette</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Name"
              placeholder="e.g. Navy & Gold Classic"
              value={name}
              onValueChange={setName}
              isRequired
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
                />
                <Input size="sm" value={background} onValueChange={v => setBackground(normalizeColor(v))} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Primary</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primary}
                  onChange={e => setPrimary(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
                />
                <Input size="sm" value={primary} onValueChange={v => setPrimary(normalizeColor(v))} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Secondary</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondary}
                  onChange={e => setSecondary(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-600"
                />
                <Input size="sm" value={secondary} onValueChange={v => setSecondary(normalizeColor(v))} className="font-mono" />
              </div>
            </div>
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
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancel</Button>
            <Button
              color="primary"
              isLoading={creating}
              isDisabled={!name.trim()}
              onPress={handleCreate}
            >
              Create &amp; Edit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
