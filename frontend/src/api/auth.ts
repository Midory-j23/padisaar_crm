import api from './axios'
import type { NotificationPrefs, User, UserOption } from '../types'

export type LoginMethod = 'email' | 'phone'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: User }>('/auth/login', { email, password }),

  sendOtp: (phone: string) =>
    api.post<{
      message: string
      expires_in: number
      resend_after: number
      debug_code?: string
    }>('/auth/otp/send', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post<{ access_token: string; user: User }>('/auth/otp/verify', { phone, code }),

  me: () => api.get<User>('/auth/me'),
  listUsers: () => api.get<UserOption[]>('/auth/users'),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ message: string }>('/auth/change-password', { current_password, new_password }),
  getNotificationPrefs: () => api.get<NotificationPrefs>('/auth/notification-prefs'),
  updateNotificationPrefs: (prefs: Partial<NotificationPrefs>) =>
    api.put<NotificationPrefs>('/auth/notification-prefs', prefs),
}
