import axios from 'axios'
import { toast } from 'sonner'
import { fa } from '@/lib/i18n/fa'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url ?? ''
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      useAuthStore.getState().logout()
      toast.error(fa.toast.sessionExpired)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
