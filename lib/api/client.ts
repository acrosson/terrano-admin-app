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

  async updateTask (id: string, payload: { title?: string; body?: string; status?: TaskStatus }): Promise<ApiResponse<Task>> {
    return fetchApi<Task>(`/v1/admin/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async deleteTask (id: string): Promise<void> {
    await fetchApi<never>(`/v1/admin/tasks/${id}`, { method: 'DELETE' })
  }
}
