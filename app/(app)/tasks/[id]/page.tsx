'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  ButtonGroup,
  Spinner,
  Textarea,
  User,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react'
import { api, type Task, type TaskUserRef, type TaskStatus, type TaskActivity, type TaskActivityVisibility } from '@/lib/api/client'

const ACTIVITY_LIMIT = 50

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

function formatDateTime (dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatStatus (s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatActivityLabel (item: TaskActivity): string {
  const { type, data } = item
  switch (type) {
    case 'TASK.CREATED':
      return 'created the task'
    case 'TASK.STATUS_CHANGED':
      return `changed status from ${formatStatus(data?.from ?? '')} → ${formatStatus(data?.to ?? '')}`
    case 'TASK.ASSIGNED_CHANGED':
      return 'changed the assignee'
    case 'TASK.OWNER_CHANGED':
      return 'changed the owner'
    case 'TASK.TITLE_CHANGED':
      return 'updated the title'
    case 'TASK.BODY_CHANGED':
      return 'updated the description'
    default:
      return String(type)
  }
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

export default function TaskDetailPage () {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [isEditingBody, setIsEditingBody] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [bodyMinHeight, setBodyMinHeight] = useState<number | null>(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const bodyViewRef = useRef<HTMLButtonElement>(null)

  // Activity
  const [activity, setActivity] = useState<TaskActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [hasMoreActivity, setHasMoreActivity] = useState(false)
  const [activityCursor, setActivityCursor] = useState<{ created_at: string; id: string } | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [commentVisibility, setCommentVisibility] = useState<TaskActivityVisibility>('SHARED')
  const [submittingComment, setSubmittingComment] = useState(false)

  const statusOptions: Array<{ value: TaskStatus; label: string }> = [
    { value: 'CREATED', label: 'Created' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]

  useEffect(() => {
    async function fetchTask () {
      if (!taskId) return

      try {
        const response = await api.getTask(taskId)
        if (response.data) {
          setTask(response.data)
        } else {
          setError('Task not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [taskId])

  useEffect(() => {
    if (!taskId) return

    async function loadInitialActivity () {
      setActivityLoading(true)
      try {
        const response = await api.getTaskActivity(taskId, { limit: ACTIVITY_LIMIT })
        const items = response.data ?? []
        setActivity(items)
        if (items.length >= ACTIVITY_LIMIT) {
          const last = items[items.length - 1]
          setActivityCursor({ created_at: last.created_at, id: last.id })
          setHasMoreActivity(true)
        }
      } catch {
        // silently fail — activity is non-critical
      } finally {
        setActivityLoading(false)
      }
    }

    loadInitialActivity()
  }, [taskId])

  function getActorName (item: TaskActivity): string {
    if (item.actor) return `${item.actor.first_name} ${item.actor.last_name}`
    return item.actor_type === 'EXTERNAL_USER' ? 'Member' : 'Staff'
  }

  function handleStatusChange (keys: Iterable<unknown>) {
    if (!task) return
    const selected = typeof keys === 'string' ? keys : Array.from(keys)[0]
    const newStatus = selected as TaskStatus
    if (newStatus && newStatus !== task.status) {
      setPendingStatus(newStatus)
      setStatusModalOpen(true)
    }
  }

  async function handleConfirmStatusChange () {
    if (!task || !pendingStatus) return
    setSaving(true)
    try {
      const response = await api.updateTask(taskId, { status: pendingStatus })
      if (response.data) {
        setTask(response.data)
      }
      setStatusModalOpen(false)
      setPendingStatus(null)
    } catch (err) {
      console.error('Failed to update task status:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteClick () {
    setDeleteModalOpen(true)
  }

  async function handleConfirmDelete () {
    try {
      setDeleting(true)
      await api.deleteTask(taskId)
      router.push('/tasks')
    } catch (err) {
      console.error('Failed to delete task:', err)
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
    }
  }

  function handleStartEditTitle () {
    if (!task) return
    setEditTitle(task.title)
    setIsEditingTitle(true)
  }

  async function handleSaveTitle () {
    if (!task || editTitle.trim() === '' || editTitle === task.title) {
      setIsEditingTitle(false)
      return
    }
    setSaving(true)
    try {
      const response = await api.updateTask(taskId, { title: editTitle.trim(), body: task.body })
      if (response.data) {
        setTask(response.data)
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    } finally {
      setSaving(false)
      setIsEditingTitle(false)
    }
  }

  function handleStartEditBody () {
    if (!task) return
    const el = bodyViewRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setBodyMinHeight(rect.height)
    }
    setEditBody(task.body)
    setIsEditingBody(true)
  }

  async function handleSaveBody () {
    if (!task || editBody === task.body) {
      setIsEditingBody(false)
      return
    }
    setSaving(true)
    try {
      const response = await api.updateTask(taskId, { title: task.title, body: editBody })
      if (response.data) {
        setTask(response.data)
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    } finally {
      setSaving(false)
      setIsEditingBody(false)
    }
  }

  async function handleLoadMoreActivity () {
    if (!activityCursor || activityLoading) return
    setActivityLoading(true)
    try {
      const response = await api.getTaskActivity(taskId, {
        limit: ACTIVITY_LIMIT,
        cursor_created_at: activityCursor.created_at,
        cursor_id: activityCursor.id
      })
      const items = response.data ?? []
      setActivity(prev => [...prev, ...items])
      if (items.length >= ACTIVITY_LIMIT) {
        const last = items[items.length - 1]
        setActivityCursor({ created_at: last.created_at, id: last.id })
      } else {
        setActivityCursor(null)
        setHasMoreActivity(false)
      }
    } catch {
      // silently fail
    } finally {
      setActivityLoading(false)
    }
  }

  async function handleSubmitComment () {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const response = await api.addTaskComment(taskId, {
        comment_body: commentBody.trim(),
        visibility: commentVisibility
      })
      if (response.data) {
        setActivity(prev => [...prev, response.data!])
        setCommentBody('')
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div>
        <div className="mb-4">
          <Button
            variant="light"
            onPress={() => router.push('/tasks')}
            className="mb-4"
          >
            ← Back to Tasks
          </Button>
        </div>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">
            {error || 'Task not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="light"
          onPress={() => router.push('/tasks')}
          className="mb-4"
        >
          ← Back to Tasks
        </Button>
        {isEditingTitle ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            autoFocus
            disabled={saving}
            className="w-full rounded border border-zinc-200 bg-transparent px-0 py-0.5 text-3xl font-bold text-black outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-0 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            placeholder="Task title"
          />
        ) : (
          <button
            type="button"
            onClick={handleStartEditTitle}
            className="w-full rounded text-left text-3xl font-bold text-black transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
          >
            {task.title}
          </button>
        )}
      </div>

      <Card>
        <CardHeader className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Select
              label="Status"
              selectedKeys={[task.status]}
              onSelectionChange={handleStatusChange}
              className="max-w-[12rem]"
              classNames={{ trigger: 'min-h-unit-10' }}
              renderValue={(items) => {
                return items.map((item) => {
                  const option = statusOptions.find((o) => o.value === item.key)
                  if (!option) return null
                  return (
                    <Chip
                      key={item.key}
                      color={getStatusColor(option.value)}
                      variant="flat"
                      size="sm"
                    >
                      {option.label}
                    </Chip>
                  )
                })
              }}
              isDisabled={saving}
            >
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} textValue={opt.label}>
                  <Chip color={getStatusColor(opt.value)} variant="flat" size="sm">
                    {opt.label}
                  </Chip>
                </SelectItem>
              ))}
            </Select>
          </div>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                aria-label="Task actions"
                className="text-zinc-500 dark:text-zinc-400"
              >
                ⋮
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Task actions">
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                onPress={handleDeleteClick}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </CardHeader>
        <CardBody className="space-y-4">
          <div
            className={isEditingBody ? 'flex flex-col' : ''}
            style={isEditingBody && bodyMinHeight != null ? { height: bodyMinHeight } : undefined}
          >
            {isEditingBody ? (
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                onBlur={handleSaveBody}
                autoFocus
                disabled={saving}
                placeholder="Markdown body..."
                className="flex-1 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                style={bodyMinHeight != null ? { minHeight: 0 } : undefined}
              />
            ) : (
              <button
                ref={bodyViewRef}
                type="button"
                onDoubleClick={handleStartEditBody}
                className="w-full rounded-lg text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100 prose-p:text-zinc-900 dark:prose-p:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-code:text-zinc-900 dark:prose-code:text-zinc-100 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100 prose-th:border-zinc-200 dark:prose-th:border-zinc-600 prose-td:border-zinc-200 dark:prose-td:border-zinc-600 cursor-text min-h-[8rem]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.body || 'Double-click to add body...'}</ReactMarkdown>
                </div>
              </button>
            )}
          </div>

          <div className="grid gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-700 md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Created At
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(task.created_at)}
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Updated At
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDateTime(task.updated_at)}
              </p>
            </div>
          </div>

          {(task.owned_by ?? task.assigned_to) && (
            <div className="flex flex-wrap gap-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {task.owned_by && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Owned By
                  </h3>
                  <TaskUser user={task.owned_by} />
                </div>
              )}
              {task.assigned_to && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Assigned To
                  </h3>
                  <TaskUser user={task.assigned_to} />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Activity Timeline */}
      <div className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Activity</h2>

        {activityLoading && activity.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : activity.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {activity.map(item => (
              item.type === 'TASK.COMMENT_ADDED' ? (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {getActorName(item)}
                    </span>
                    {item.visibility === 'INTERNAL_ONLY' && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Internal only
                      </span>
                    )}
                    <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {item.comment_body}
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{getActorName(item)}</span>
                  <span>{formatActivityLabel(item)}</span>
                  <span className="ml-auto whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
              )
            ))}

            {hasMoreActivity && (
              <div className="flex justify-center pt-2">
                <Button variant="light" size="sm" onPress={handleLoadMoreActivity} isLoading={activityLoading}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Comment form */}
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <Textarea
            value={commentBody}
            onValueChange={setCommentBody}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmitComment()
              }
            }}
            placeholder="Add a comment..."
            minRows={3}
            isDisabled={submittingComment}
            variant="bordered"
          />
          <div className="mt-2 flex items-center gap-2">
            <ButtonGroup size="sm" variant="bordered">
              <Button
                onPress={() => setCommentVisibility('SHARED')}
                color={commentVisibility === 'SHARED' ? 'primary' : 'default'}
                variant={commentVisibility === 'SHARED' ? 'solid' : 'bordered'}
              >
                Shared
              </Button>
              <Button
                onPress={() => setCommentVisibility('INTERNAL_ONLY')}
                color={commentVisibility === 'INTERNAL_ONLY' ? 'warning' : 'default'}
                variant={commentVisibility === 'INTERNAL_ONLY' ? 'solid' : 'bordered'}
              >
                Internal only
              </Button>
            </ButtonGroup>
            <Button
              size="sm"
              color="primary"
              onPress={handleSubmitComment}
              isLoading={submittingComment}
              isDisabled={!commentBody.trim()}
              className="ml-auto"
            >
              Comment
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        placement="center"
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Change status
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to change the status to{' '}
                  <strong>
                    {pendingStatus != null
                      ? statusOptions.find((o) => o.value === pendingStatus)?.label ?? pendingStatus.replace('_', ' ')
                      : ''}
                  </strong>
                  ?
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmStatusChange}
                  isLoading={saving}
                >
                  Confirm
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        placement="center"
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Delete task
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Are you sure you want to delete this task? This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={deleting}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={deleting}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
