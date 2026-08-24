import axios from 'axios'
import { toast } from 'sonner'
import { fa } from '@/lib/i18n/fa'
import { reportClientError, markBackendUnreachable } from '@/lib/errorReporter'
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
    const url = String(error.config?.url ?? '')
    const method = String(error.config?.method ?? 'get').toUpperCase()
    const status = error.response?.status as number | undefined

    if (status === 401 && !url.includes('/auth/login')) {
      useAuthStore.getState().logout()
      toast.error(fa.toast.sessionExpired)
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (!url.includes('/errors')) {
      if (!error.response) {
        markBackendUnreachable()
        reportClientError({
          source: 'frontend',
          message: 'خطا در اتصال به سرور',
          path: window.location.pathname,
          extra: { api_url: url, method },
        })
      } else if (status && status >= 500) {
        const detail = error.response.data?.detail
        const detailText = typeof detail === 'string' ? detail : ''
        reportClientError({
          source: 'frontend',
          message: `HTTP ${status}: ${method} ${url}${detailText ? ` — ${detailText}` : ''}`,
          path: url,
          method,
          status_code: status,
          extra: { page: window.location.pathname },
        })
      }
    }

    return Promise.reject(error)
  }
)

export default api
