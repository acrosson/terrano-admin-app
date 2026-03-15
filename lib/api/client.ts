import { getToken } from '../utils/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

if (!API_URL && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_API_URL is not set. API calls will fail.')
}

export interface ApiResponse<T> {
  data: T | null
  errors: string[] | null
}

export interface RequestCodeResponse {
  message: string
}

export interface VerifyCodeResponse {
  access_token: string
  token_type: string
}

export type UserRole = 'ADMIN' | 'STAFF' | 'MEMBER'

export interface User {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  first_name: string
  last_name: string
  primary_email: string
  primary_phone: string
  is_active: boolean
  role: UserRole
  companies: Company[]
}

export interface Company {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  name: string
  city: string | null
  state: string | null
  description: string | null
}

export type TaskStatus = 'CREATED' | 'IN_REVIEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface TaskUserRef {
  id: string
  first_name: string
  last_name: string
}

export interface Task {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  title: string
  body: string
  status: TaskStatus
  created_by_id: string
  created_by?: TaskUserRef
  owned_by_id: string
  owned_by?: TaskUserRef
  assigned_to_id: string
  assigned_to?: TaskUserRef
}

export type TaskActivityType =
  | 'TASK.CREATED'
  | 'TASK.STATUS_CHANGED'
  | 'TASK.ASSIGNED_CHANGED'
  | 'TASK.OWNER_CHANGED'
  | 'TASK.TITLE_CHANGED'
  | 'TASK.BODY_CHANGED'
  | 'TASK.COMMENT_ADDED'

export type TaskActivityVisibility = 'SHARED' | 'INTERNAL_ONLY'

export interface TaskActivity {
  id: string
  task_id: string
  type: TaskActivityType
  actor_type: 'INTERNAL_USER' | 'EXTERNAL_USER'
  actor_id: string
  actor: TaskUserRef | null
  comment_body: string | null
  data: Record<string, string> | null
  visibility: TaskActivityVisibility
  created_at: string
}

export interface DesignIcon {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  name: string
  slug: string
  source: string
  category: string | null
  style: string | null
  tags: string[]
  preview_s3_key: string  // e.g. "dev/design/icons/tabler-canary-outline.svg"
  is_active: boolean
}

const ICON_S3_BASE = 'https://terrano-ai.s3.us-east-1.amazonaws.com'

/** Build the full image URL from a DesignIcon's S3 key */
export function designIconUrl (icon: DesignIcon): string {
  return `${ICON_S3_BASE}/${icon.preview_s3_key}`
}

export interface DesignTemplatePage {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  design_template_id: string
  page_index: number
  page_role: string
  version: number
  is_current: boolean
  page_json: Record<string, unknown>
}

export interface DesignTemplate {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  name: string
  slug: string
  design_type: string
  category: string
  thumbnail_url: string | null
  is_active: boolean
  style_tags: string[]
  current_template_page_id: string | null
  pages: DesignTemplatePage[]
}

export interface DesignIconsResponse {
  data: DesignIcon[] | null
  errors: string[] | null
  meta?: {
    total?: number
    page?: number
    per_page?: number
    total_pages?: number
  }
}

export type DesignRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface DesignRequest {
  id: string
  created_at: string
  updated_at: string
  task_id: string
  design_type: string
  status: DesignRequestStatus
  input_data: {
    business_name?: string
    business_context_raw?: string
    scope_answers?: Record<string, string>
  }
  selected_project_id: string | null
}

export interface DesignProject {
  id: string
  created_at: string
  updated_at: string
  design_request_id: string
  design_template_id: string
  design_type: string
  title: string
  status: string
  variables: Record<string, string>
  pages: DesignTemplatePage[]
}

export interface DesignFont {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  family: string
  slug: string
  source: string
  category: string
  weights: number[]
  styles: string[]
  google_font_family: string
  google_font_css_url: string
  is_active: boolean
}

async function fetchApi<T> (
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!API_URL) {
    throw new Error('API URL is not configured. Please set NEXT_PUBLIC_API_URL environment variable.')
  }

  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const method = options.method || 'GET'
  const url = `${API_URL}${endpoint}`

  // Log the actual request being made (POST, not OPTIONS)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Making ${method} request to ${url}`)
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ errors: ['An error occurred'] }))
    throw new Error(errorData.errors?.[0] || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return undefined as unknown as ApiResponse<T>
  return response.json()
}

export const api = {
  async requestCode (email: string): Promise<ApiResponse<RequestCodeResponse>> {
    return fetchApi<RequestCodeResponse>('/v1/auth/request-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },

  async verifyCode (email: string, code: string): Promise<ApiResponse<VerifyCodeResponse>> {
    return fetchApi<VerifyCodeResponse>('/v1/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    })
  },

  async getMe (): Promise<ApiResponse<User>> {
    return fetchApi<User>('/v1/users/me', {
      method: 'GET'
    })
  },

  async getAdminUsers (): Promise<ApiResponse<User[]>> {
    return fetchApi<User[]>('/v1/admin/users', {
      method: 'GET'
    })
  },

  async getTasks (): Promise<ApiResponse<Task[]>> {
    return fetchApi<Task[]>('/v1/admin/tasks', {
      method: 'GET'
    })
  },

  async createTask (payload: { title: string; body: string; owned_by_id: string; assigned_to_id: string }): Promise<ApiResponse<Task>> {
    return fetchApi<Task>('/v1/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async getTask (id: string): Promise<ApiResponse<Task>> {
    return fetchApi<Task>(`/v1/tasks/${id}`, {
      method: 'GET'
    })
  },

  async updateTask (id: string, payload: { title?: string; body?: string; status?: TaskStatus; assigned_to_id?: string; owned_by_id?: string }): Promise<ApiResponse<Task>> {
    return fetchApi<Task>(`/v1/admin/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async deleteTask (id: string): Promise<void> {
    await fetchApi<never>(`/v1/admin/tasks/${id}`, { method: 'DELETE' })
  },

  async getTaskActivity (
    id: string,
    params?: {
      visibility?: TaskActivityVisibility
      limit?: number
      cursor_created_at?: string
      cursor_id?: string
    }
  ): Promise<ApiResponse<TaskActivity[]>> {
    const query = new URLSearchParams()
    if (params?.visibility) query.set('visibility', params.visibility)
    if (params?.limit != null) query.set('limit', String(params.limit))
    if (params?.cursor_created_at) query.set('cursor_created_at', params.cursor_created_at)
    if (params?.cursor_id) query.set('cursor_id', params.cursor_id)
    const qs = query.toString()
    return fetchApi<TaskActivity[]>(`/v1/tasks/${id}/activity${qs ? `?${qs}` : ''}`)
  },

  async addTaskComment (
    id: string,
    payload: { comment_body: string; visibility?: TaskActivityVisibility; mention_ids?: string[] }
  ): Promise<ApiResponse<TaskActivity>> {
    return fetchApi<TaskActivity>(`/v1/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async getDesignIcons (params: {
    tag?: string
    style?: string
    is_active?: boolean
    page?: number
    per_page?: number
  } = {}): Promise<DesignIconsResponse> {
    const q = new URLSearchParams()
    if (params.tag) q.set('tag', params.tag)
    if (params.style) q.set('style', params.style)
    if (params.is_active != null) q.set('is_active', String(params.is_active))
    if (params.page != null) q.set('page', String(params.page))
    if (params.per_page != null) q.set('per_page', String(params.per_page))
    const qs = q.toString()
    return fetchApi<DesignIconsResponse>(`/v1/design/icons${qs ? `?${qs}` : ''}`) as unknown as DesignIconsResponse
  },

  async getDesignIcon (id: string): Promise<ApiResponse<DesignIcon>> {
    return fetchApi<DesignIcon>(`/v1/design/icons/${id}`, { method: 'GET' })
  },

  async getDesignTemplates (): Promise<ApiResponse<DesignTemplate[]>> {
    return fetchApi<DesignTemplate[]>('/v1/admin/design/templates', { method: 'GET' })
  },

  async getDesignTemplate (id: string): Promise<ApiResponse<DesignTemplate>> {
    return fetchApi<DesignTemplate>(`/v1/admin/design/templates/${id}`, { method: 'GET' })
  },

  async createDesignTemplate (payload: {
    name: string
    slug: string
    design_type: string
    category: string
  }): Promise<ApiResponse<DesignTemplate>> {
    return fetchApi<DesignTemplate>('/v1/admin/design/templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async createDesignTemplatePage (
    templateId: string,
    payload: {
      page_index: number
      page_role: string
      version: number
      is_current: boolean
      page_json: Record<string, unknown>
    }
  ): Promise<ApiResponse<DesignTemplatePage>> {
    return fetchApi<DesignTemplatePage>(`/v1/admin/design/templates/${templateId}/pages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async duplicateDesignTemplate (id: string): Promise<ApiResponse<DesignTemplate>> {
    return fetchApi<DesignTemplate>(`/v1/admin/design/templates/${id}/duplicate`, { method: 'POST' })
  },

  async updateDesignTemplate (
    id: string,
    payload: { name?: string; is_active?: boolean; style_tags?: string[] }
  ): Promise<ApiResponse<DesignTemplate>> {
    return fetchApi<DesignTemplate>(`/v1/admin/design/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async updateDesignTemplatePage (
    pageId: string,
    payload: { page_json: Record<string, unknown> }
  ): Promise<ApiResponse<DesignTemplatePage>> {
    return fetchApi<DesignTemplatePage>(`/v1/admin/design/template-pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async getDesignFonts (): Promise<ApiResponse<DesignFont[]>> {
    return fetchApi<DesignFont[]>('/v1/design/fonts', { method: 'GET' })
  },

  async getDesignFont (id: string): Promise<ApiResponse<DesignFont>> {
    return fetchApi<DesignFont>(`/v1/design/fonts/${id}`, { method: 'GET' })
  },

  async getDesignRequests (params: {
    status?: DesignRequestStatus
    design_type?: string
    task_id?: string
    offset?: number
    limit?: number
  } = {}): Promise<ApiResponse<DesignRequest[]>> {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.design_type) q.set('design_type', params.design_type)
    if (params.task_id) q.set('task_id', params.task_id)
    if (params.offset != null) q.set('offset', String(params.offset))
    if (params.limit != null) q.set('limit', String(params.limit))
    const qs = q.toString()
    return fetchApi<DesignRequest[]>(`/v1/admin/design/requests${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  async getDesignRequest (id: string): Promise<ApiResponse<DesignRequest>> {
    return fetchApi<DesignRequest>(`/v1/admin/design/requests/${id}`, { method: 'GET' })
  },

  async getDesignRequestProjects (requestId: string): Promise<ApiResponse<DesignProject[]>> {
    return fetchApi<DesignProject[]>(`/v1/admin/design/requests/${requestId}/projects`, { method: 'GET' })
  }
}
