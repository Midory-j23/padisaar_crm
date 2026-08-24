import api from './axios'
import type { ErrorSource } from '@/lib/errorReporter'

export type { ErrorSource }
export type ErrorStatus = 'open' | 'resolved'

export interface ErrorReport {
  id: string
  fingerprint: string
  source: ErrorSource
  status: ErrorStatus
  message: string
  stack?: string | null
  path?: string | null
  method?: string | null
  status_code?: number | null
  user_id?: string | null
  user_name?: string | null
  user_agent?: string | null
  app_version?: string | null
  occurrence_count: number
  extra?: Record<string, unknown>
  created_at: string
  last_seen_at: string
  resolved_at?: string | null
  resolved_by_name?: string | null
}

export interface ErrorReportListResponse {
  items: ErrorReport[]
  total: number
  page: number
  per_page: number
}

export const errorsApi = {
  create: (payload: {
    source?: 'frontend' | 'backend'
    message: string
    stack?: string
    path?: string
    method?: string
    status_code?: number
    extra?: Record<string, unknown>
  }) => api.post<ErrorReport>('/errors', payload),

  list: (params?: { status?: string; source?: string; page?: number; per_page?: number }) =>
    api.get<ErrorReportListResponse>('/errors', { params }),
  openCount: () => api.get<{ count: number }>('/errors/open-count'),
  resolve: (id: string) => api.put<ErrorReport>(`/errors/${id}/resolve`),
}
