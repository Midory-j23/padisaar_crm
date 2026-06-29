import api from './axios'
import type { User, UserRole } from '../types'

export interface ManagedUser extends User {
  is_active: boolean
}

export const usersApi = {
  list: () => api.get<ManagedUser[]>('/users'),

  create: (data: { name: string; email: string; password: string; role: UserRole }) =>
    api.post<ManagedUser>('/users', data),

  update: (id: string, data: Partial<{ name: string; role: UserRole; is_active: boolean }>) =>
    api.put<ManagedUser>(`/users/${id}`, data),
}
