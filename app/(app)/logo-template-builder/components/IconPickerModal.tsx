'use client'

import { useState, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
  Pagination,
} from '@heroui/react'
import { api, designIconUrl } from '@/lib/api/client'
import type { DesignIcon } from '@/lib/api/client'

const PER_PAGE = 32

interface IconPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (icon: DesignIcon) => void
  usageType?: string
}

export function IconPickerModal ({ isOpen, onClose, onSelect, usageType }: IconPickerModalProps) {
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState<DesignIcon[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const search = useCallback(async (tag: string, p: number) => {
    setLoading(true)
    try {
      const res = await api.getDesignIcons({
        tag: tag.trim() || undefined,
        is_active: true,
        usage_type: usageType,
        page: p,
        per_page: PER_PAGE,
      })
      const data = res.data ?? []
      setIcons(data)
      setHasSearched(true)

      // Use meta if available, otherwise estimate from result length
      if (res.meta?.total_pages != null) {
        setTotalPages(res.meta.total_pages)
      } else if (res.meta?.total != null) {
        setTotalPages(Math.ceil(res.meta.total / PER_PAGE))
      } else {
        // If we got a full page, there may be more; otherwise we're on the last page
        setTotalPages(data.length === PER_PAGE ? p + 1 : p)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSubmit (e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    search(query, 1)
  }

  function handlePageChange (p: number) {
    setPage(p)
    search(query, p)
  }

  function handleSelect (icon: DesignIcon) {
    onSelect(icon)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="text-base">Pick an Icon</ModalHeader>

        <ModalBody>
          {/* Search bar */}
          <form onSubmit={handleSubmit}>
            <Input
              placeholder='Search icons — press Enter to search (e.g. "construction", "bird")'
              value={query}
              onValueChange={setQuery}
              endContent={
                <Button size="sm" type="submit" color="primary" variant="flat" isLoading={loading}>
                  Search
                </Button>
              }
            />
          </form>

          {/* States */}
          {loading && (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          )}

          {!loading && !hasSearched && (
            <p className="py-16 text-center text-sm text-zinc-400">
              Search for icons above to get started
            </p>
          )}

          {!loading && hasSearched && icons.length === 0 && (
            <p className="py-16 text-center text-sm text-zinc-400">
              No icons found for &ldquo;{query}&rdquo;
            </p>
          )}

          {/* Icon grid — 8 columns */}
          {!loading && icons.length > 0 && (
            <div className="grid grid-cols-8 gap-1">
              {icons.map(icon => (
                <button
                  key={icon.id}
                  onClick={() => handleSelect(icon)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  title={icon.name}
                >
                  {designIconUrl(icon) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={designIconUrl(icon)}
                      alt={icon.name}
                      className="h-10 w-10 object-contain dark:invert"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-[8px] text-zinc-400 dark:bg-zinc-700">
                      {icon.name.slice(0, 4)}
                    </div>
                  )}
                  <span className="w-full truncate text-center text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {icon.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ModalBody>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <ModalFooter className="justify-center border-t border-zinc-100 dark:border-zinc-700">
            <Pagination
              total={totalPages}
              page={page}
              onChange={handlePageChange}
              size="sm"
              showControls
            />
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
}
