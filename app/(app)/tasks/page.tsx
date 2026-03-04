'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Select,
  SelectItem,
  User,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  Autocomplete,
  AutocompleteItem
} from '@heroui/react'
import { api, type Task, type TaskStatus, type TaskUserRef, type User as ApiUser } from '@/lib/api/client'

function getStatusColor (status: Task['status']) {
  switch (status) {
    case 'CREATED':
      return 'default'
    case 'IN_REVIEW':
      return 'warning'
    case 'IN_PROGRESS':
      return 'primary'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}

function formatDate (dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function TaskUser ({ user }: { user: TaskUserRef }) {
  const name = `${user.first_name} ${user.last_name}`
  return (
    <User
      name={name}
      avatarProps={{
        name,
        showFallback: true,
        classNames: { base: 'bg-primary/10 text-primary' }
      }}
      classNames={{ name: 'text-sm font-medium' }}
    />
  )
}

export default function TasksPage () {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'ALL'>('ALL')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createBody, setCreateBody] = useState('')
  const [createOwnedByKey, setCreateOwnedByKey] = useState<string | null>(null)
  const [createAssignedToKey, setCreateAssignedToKey] = useState<string | null>(null)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const statusOptions: Array<{ value: TaskStatus | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'All' },
    { value: 'CREATED', label: 'Created' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]

  const filteredTasks = useMemo(() => {
    if (selectedStatus === 'ALL') {
      return tasks
    }
    return tasks.filter((task) => task.status === selectedStatus)
  }, [tasks, selectedStatus])

  useEffect(() => {
    async function fetchTasks () {
      try {
        const response = await api.getTasks()
        if (response.data) {
          setTasks(response.data)
        } else {
          setError('Failed to load tasks')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  useEffect(() => {
    if (!createModalOpen) return
    let cancelled = false
    setUsersLoading(true)
    Promise.all([api.getAdminUsers(), api.getMe()])
      .then(([usersRes, meRes]) => {
        if (cancelled) return
        if (usersRes.data) setUsers(usersRes.data)
        if (meRes.data?.id) setCreateAssignedToKey(meRes.data.id)
      })
      .finally(() => { if (!cancelled) setUsersLoading(false) })
    return () => { cancelled = true }
  }, [createModalOpen])

  function handleCloseCreateModal () {
    setCreateModalOpen(false)
    setCreateTitle('')
    setCreateBody('')
    setCreateOwnedByKey(null)
    setCreateAssignedToKey(null)
    setCreateError(null)
  }

  async function handleCreateTask () {
    if (!createTitle.trim()) {
      setCreateError('Title is required')
      return
    }
    if (!createOwnedByKey) {
      setCreateError('Please select the client who owns the task')
      return
    }
    if (!createAssignedToKey) {
      setCreateError('Please assign the task to a user')
      return
    }
    setCreateError(null)
    setCreateSaving(true)
    try {
      const response = await api.createTask({
        title: createTitle.trim(),
        body: createBody,
        owned_by_id: createOwnedByKey,
        assigned_to_id: createAssignedToKey
      })
      if (response.data?.id) {
        handleCloseCreateModal()
        router.push(`/tasks/${response.data.id}`)
      } else {
        setCreateError('Failed to create task')
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setCreateSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-zinc-100">Tasks</h1>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-100">Tasks</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button color="primary" onPress={() => setCreateModalOpen(true)}>
            Create
          </Button>
          <Select
          label="Filter by Status"
          placeholder="All Statuses"
          selectedKeys={[selectedStatus]}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as TaskStatus | 'ALL'
            setSelectedStatus(selected)
          }}
          className="w-full sm:w-64"
          classNames={{
            trigger: 'min-h-unit-10'
          }}
          renderValue={(items) => {
            return items.map((item) => {
              const option = statusOptions.find((o) => o.value === item.key)
              if (!option) return null
              if (option.value === 'ALL') {
                return <span key={item.key}>{option.label}</span>
              }
              return (
                <Chip
                  key={item.key}
                  color={getStatusColor(option.value as TaskStatus)}
                  variant="flat"
                  size="sm"
                >
                  {option.label}
                </Chip>
              )
            })
          }}
        >
          {statusOptions.map((option) => (
            <SelectItem
              key={option.value}
              textValue={option.label}
            >
              <div className="flex items-center gap-2">
                <Chip
                  color={option.value !== 'ALL' ? getStatusColor(option.value as TaskStatus) : 'default'}
                  variant="flat"
                  size="sm"
                >
                  {option.label}
                </Chip>
              </div>
            </SelectItem>
          ))}
        </Select>
        </div>
      </div>

      <Modal
        isOpen={createModalOpen}
        onOpenChange={(open) => { if (!open) handleCloseCreateModal() }}
        placement="center"
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Create task</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                label="Title"
                placeholder="Task title"
                value={createTitle}
                onValueChange={setCreateTitle}
                isDisabled={createSaving}
              />
              <Textarea
                label="Body"
                placeholder="Markdown body..."
                value={createBody}
                onValueChange={setCreateBody}
                minRows={8}
                classNames={{ input: 'font-mono' }}
                isDisabled={createSaving}
              />
              <Autocomplete
                label="Owned by"
                placeholder="Search users (client who owns the task)..."
                selectedKey={createOwnedByKey}
                onSelectionChange={(key) => setCreateOwnedByKey(key as string | null)}
                defaultItems={users}
                isLoading={usersLoading}
                isDisabled={createSaving}
              >
                {(user) => (
                  <AutocompleteItem key={user.id} textValue={`${user.first_name} ${user.last_name}`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{user.first_name} {user.last_name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.primary_email}</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>
              <Autocomplete
                label="Assigned to"
                placeholder="Search users..."
                selectedKey={createAssignedToKey}
                onSelectionChange={(key) => setCreateAssignedToKey(key as string | null)}
                defaultItems={users}
                isLoading={usersLoading}
                isDisabled={createSaving}
              >
                {(user) => (
                  <AutocompleteItem key={user.id} textValue={`${user.first_name} ${user.last_name}`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{user.first_name} {user.last_name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.primary_email}</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>
              {createError && (
                <p className="text-sm text-danger">{createError}</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleCloseCreateModal} isDisabled={createSaving}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleCreateTask} isLoading={createSaving}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {tasks.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-zinc-600 dark:text-zinc-400">
              No tasks found. Create your first task to get started.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-center text-zinc-600 dark:text-zinc-400">
                  No tasks found with status &quot;{statusOptions.find((o) => o.value === selectedStatus)?.label}&quot;.
                </p>
              </CardBody>
            </Card>
          ) : (
            filteredTasks.map((task) => (
            <Card
              key={task.id}
              isPressable
              onPress={() => router.push(`/tasks/${task.id}`)}
              className="cursor-pointer transition-all hover:shadow-lg"
            >
              <CardHeader className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-lg font-semibold text-black dark:text-zinc-100 mb-1 text-left">
                    {task.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 text-left">
                    {task.body}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {task.status === 'IN_PROGRESS' && (
                      <Spinner size="sm" color="primary" />
                    )}
                    <Chip color={getStatusColor(task.status)} variant="flat">
                      {task.status.replace('_', ' ')}
                    </Chip>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap">
                    {formatDate(task.created_at)}
                  </p>
                </div>
              </CardHeader>
              {(task.owned_by ?? task.assigned_to) && (
                <CardBody className="pt-0 flex flex-row flex-wrap gap-4 border-t border-zinc-200 dark:border-zinc-700">
                  {task.owned_by && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Owned By</p>
                      <TaskUser user={task.owned_by} />
                    </div>
                  )}
                  {task.assigned_to && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Assigned To</p>
                      <TaskUser user={task.assigned_to} />
                    </div>
                  )}
                </CardBody>
              )}
            </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
