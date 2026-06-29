import api from './axios'
import type { Contact, ContactListResponse } from '../types'

export const contactsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ContactListResponse>('/contacts', { params }),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: Partial<Contact>) => api.post<Contact>('/contacts', data),
  update: (id: string, data: Partial<Contact>) => api.put<Contact>(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
}
