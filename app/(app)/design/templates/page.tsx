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
import type { DesignTemplate } from '@/lib/api/client'

const DESIGN_TYPES = ['LOGO']
const CATEGORIES = ['WORDMARK', 'ICON_WORDMARK', 'EMBLEM', 'BADGE', 'MONOGRAM', 'ABSTRACT_MARK', 'CUSTOM']

function slugify (name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function DesignTemplatesPage () {
  const router = useRouter()
  const [templates, setTemplates] = useState<DesignTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // New template form state
  const [name, setName] = useState('')
  const [designType, setDesignType] = useState('LOGO')
  const [category, setCategory] = useState('WORDMARK')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadTemplates = useCallback(() => {
    setLoading(true)
    api.getDesignTemplates()
      .then(res => setTemplates(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  async function handleDuplicate (template: DesignTemplate) {
    try {
      await api.duplicateDesignTemplate(template.id)
      addToast({ title: 'Template duplicated', color: 'success' })
      loadTemplates()
    } catch {
      addToast({ title: 'Failed to duplicate template', color: 'danger' })
    }
  }

  async function handleCreate () {
    if (!name.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await api.createDesignTemplate({
        name: name.trim(),
        slug: slugify(name),
        design_type: designType,
        category,
      })
      if (res.data) {
        router.push(`/logo-template-builder/${res.data.id}`)
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create template')
      setCreating(false)
    }
  }

  function handleRowClick (template: DesignTemplate) {
    router.push(`/logo-template-builder/${template.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs>
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem>Templates</BreadcrumbItem>
          </Breadcrumbs>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Design Templates</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manage logo and design templates</p>
        </div>
        <Button color="primary" onPress={() => setModalOpen(true)}>
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <Table aria-label="Design templates" selectionMode="none">
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Type</TableColumn>
            <TableColumn>Category</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Created</TableColumn>
            <TableColumn className="w-10"> </TableColumn>
          </TableHeader>
          <TableBody emptyContent="No templates yet. Create one to get started.">
            {templates.map(template => (
              <TableRow
                key={template.id}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => handleRowClick(template)}
              >
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>{template.design_type.toLowerCase()}</TableCell>
                <TableCell>{template.category.replace(/_/g, ' ').toLowerCase()}</TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    color={template.is_active ? 'success' : 'default'}
                    variant="flat"
                  >
                    {template.is_active ? 'Active' : 'Draft'}
                  </Chip>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {new Date(template.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light" aria-label="Actions">
                        <span className="text-lg leading-none">⋯</span>
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Template actions">
                      <DropdownItem key="duplicate" onPress={() => handleDuplicate(template)}>
                        Duplicate
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* New Template Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalContent>
          <ModalHeader>New Template</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Name"
              placeholder="e.g. Modern Wordmark"
              value={name}
              onValueChange={setName}
              isRequired
            />
            <Select
              label="Design Type"
              selectedKeys={[designType]}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0] as string
                if (val) setDesignType(val)
              }}
            >
              {DESIGN_TYPES.map(t => (
                <SelectItem key={t}>{t.toLowerCase()}</SelectItem>
              ))}
            </Select>
            <Select
              label="Category"
              selectedKeys={[category]}
              onSelectionChange={keys => {
                const val = Array.from(keys)[0] as string
                if (val) setCategory(val)
              }}
            >
              {CATEGORIES.map(c => (
                <SelectItem key={c}>{c.replace(/_/g, ' ').toLowerCase()}</SelectItem>
              ))}
            </Select>
            {createError && (
              <p className="text-sm text-danger">{createError}</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>Cancel</Button>
            <Button
              color="primary"
              isLoading={creating}
              isDisabled={!name.trim()}
              onPress={handleCreate}
            >
              Create &amp; Open
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
