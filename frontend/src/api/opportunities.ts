import api from './axios'
import type { KanbanBoard } from '@/lib/opportunityConstants'
import type { Opportunity, OpportunityDetail, OpportunityListResponse } from '../types'

export const opportunitiesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<OpportunityListResponse>('/opportunities', { params }),
  kanban: (params?: Record<string, string | undefined>) =>
    api.get<KanbanBoard>('/opportunities/kanban', { params }),
  get: (id: string) => api.get<OpportunityDetail>(`/opportunities/${id}`),
  create: (data: Record<string, unknown>) => api.post<Opportunity>('/opportunities', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Opportunity>(`/opportunities/${id}`, data),
  delete: (id: string) => api.delete(`/opportunities/${id}`),
  summary: () => api.get('/opportunities/summary'),
}
