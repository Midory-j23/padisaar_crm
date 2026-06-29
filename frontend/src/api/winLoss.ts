import api from './axios'
import type {
  LessonsResponse,
  WinLossListResponse,
  WinLossRecord,
  WinLossSummary,
} from '../types'

export const winLossApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<WinLossListResponse>('/win-loss', { params }),
  get: (id: string) => api.get<WinLossRecord>(`/win-loss/${id}`),
  create: (data: Record<string, unknown>) => api.post<WinLossRecord>('/win-loss', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<WinLossRecord>(`/win-loss/${id}`, data),
  summary: () => api.get<WinLossSummary>('/win-loss/summary'),
  lessons: (params?: Record<string, string | number | undefined>) =>
    api.get<LessonsResponse>('/win-loss/lessons', { params }),
}
