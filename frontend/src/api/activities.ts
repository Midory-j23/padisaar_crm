import api from './axios'
import type { Activity, ActivityListResponse, OverdueActivitiesResponse } from '../types'

export const activitiesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ActivityListResponse>('/activities', { params }),
  get: (id: string) => api.get<Activity>(`/activities/${id}`),
  create: (data: Record<string, unknown>) => api.post<Activity>('/activities', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Activity>(`/activities/${id}`, data),
  delete: (id: string) => api.delete(`/activities/${id}`),
  overdue: () => api.get<OverdueActivitiesResponse>('/activities/overdue'),
  overdueCount: () => api.get<{ count: number }>('/activities/overdue/count'),
  completeFollowup: (id: string) =>
    api.put<Activity>(`/activities/${id}/complete-followup`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string; filename: string }>('/activities/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
