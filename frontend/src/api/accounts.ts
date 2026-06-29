import api from './axios'
import type { Account, AccountListResponse, AuditLogEntry } from '../types'

export const accountsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<AccountListResponse>('/accounts', { params }),
  get: (id: string) => api.get<Account>(`/accounts/${id}`),
  create: (data: Partial<Account>) => api.post<Account>('/accounts', data),
  update: (id: string, data: Partial<Account>) => api.put<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
  auditLogs: (id: string) => api.get<AuditLogEntry[]>(`/accounts/${id}/audit-logs`),
}
