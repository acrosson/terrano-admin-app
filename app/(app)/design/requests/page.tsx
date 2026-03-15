'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Breadcrumbs,
  BreadcrumbItem,
  Chip,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
} from '@heroui/react'
import { api } from '@/lib/api/client'
import type { DesignRequest, DesignRequestStatus } from '@/lib/api/client'

const STATUS_OPTIONS: { key: DesignRequestStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All statuses' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
]

const STATUS_COLOR: Record<DesignRequestStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
}

export default function DesignRequestsPage () {
  const router = useRouter()
  const [requests, setRequests] = useState<DesignRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<DesignRequestStatus | 'ALL'>('ALL')

  useEffect(() => {
    setLoading(true)
    const params = statusFilter !== 'ALL' ? { status: statusFilter } : {}
    api.getDesignRequests(params)
      .then(res => setRequests(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs>
            <BreadcrumbItem href="/design">Design</BreadcrumbItem>
            <BreadcrumbItem>Requests</BreadcrumbItem>
          </Breadcrumbs>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Design Requests</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">All logo and design generation requests</p>
        </div>
        <div className="w-44">
          <Select
            size="sm"
            aria-label="Filter by status"
            selectedKeys={[statusFilter]}
            onSelectionChange={keys => {
              const val = Array.from(keys)[0] as DesignRequestStatus | 'ALL'
              if (val) setStatusFilter(val)
            }}
          >
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.key}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <Table aria-label="Design requests" selectionMode="none">
          <TableHeader>
            <TableColumn>Business</TableColumn>
            <TableColumn>Type</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Projects</TableColumn>
            <TableColumn>Created</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No design requests found.">
            {requests.map(req => (
              <TableRow
                key={req.id}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => router.push(`/design/requests/${req.id}`)}
              >
                <TableCell className="font-medium">
                  {req.input_data?.business_name ?? '—'}
                </TableCell>
                <TableCell className="capitalize">{req.design_type.toLowerCase()}</TableCell>
                <TableCell>
                  <Chip size="sm" color={STATUS_COLOR[req.status]} variant="flat">
                    {req.status.replace('_', ' ')}
                  </Chip>
                </TableCell>
                <TableCell>
                  {req.selected_project_id ? (
                    <Chip size="sm" color="success" variant="flat">Selected</Chip>
                  ) : (
                    <span className="text-zinc-400 text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {new Date(req.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
