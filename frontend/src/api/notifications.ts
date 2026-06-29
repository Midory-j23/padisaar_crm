import api from './axios'
import type { Notification, NotificationListResponse, UnreadCountResponse } from '../types'

export const notificationsApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    api.get<NotificationListResponse>('/notifications', { params }),

  unreadCount: () => api.get<UnreadCountResponse>('/notifications/unread-count'),

  markRead: (id: string) => api.put<Notification>(`/notifications/${id}/read`),

  markAllRead: () => api.put<{ message: string }>('/notifications/read-all'),

  generate: () => api.post<{ generated: boolean; unread_count: number }>('/notifications/generate'),
}
