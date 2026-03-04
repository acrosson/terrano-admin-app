'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner
} from '@heroui/react'
import { api, type User } from '@/lib/api/client'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined' },
  { key: 'companies', label: 'Companies' }
]

function formatDate (dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getRoleColor (role: User['role']) {
  switch (role) {
    case 'ADMIN':
      return 'danger'
    case 'STAFF':
      return 'primary'
    case 'MEMBER':
      return 'default'
    default:
      return 'default'
  }
}

export default function UsersPage () {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers () {
      try {
        const response = await api.getAdminUsers()
        if (response.data) {
          setUsers(response.data)
        } else {
          setError('Failed to load users')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-zinc-100">Users</h1>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-black dark:text-zinc-100">Users</h1>

      <Table aria-label="Users table">
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={users}
          isLoading={loading}
          loadingContent={<Spinner size="md" />}
          emptyContent="No users found."
        >
          {(item) => (
            <TableRow key={item.id}>
              <TableCell>{item.first_name} {item.last_name}</TableCell>
              <TableCell>{item.primary_email}</TableCell>
              <TableCell>{item.primary_phone || '—'}</TableCell>
              <TableCell>
                <Chip color={getRoleColor(item.role)} size="sm" variant="flat">
                  {item.role}
                </Chip>
              </TableCell>
              <TableCell>
                {item.is_active ? (
                  <Chip color="success" size="sm" variant="flat">Active</Chip>
                ) : (
                  <Chip color="warning" size="sm" variant="flat">Inactive</Chip>
                )}
              </TableCell>
              <TableCell>{formatDate(item.created_at)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.companies.length === 0
                    ? '—'
                    : item.companies.map((company) => (
                        <Chip key={company.id} size="sm" variant="bordered">
                          {company.name}
                        </Chip>
                      ))}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
