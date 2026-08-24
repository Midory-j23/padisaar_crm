import { useAuthStore } from '../store/authStore'
import { APP_VERSION } from '@/lib/version'

export type ErrorSource = 'frontend' | 'backend'

export interface ErrorReportPayload {
  source?: ErrorSource
  message: string
  stack?: string
  path?: string
  method?: string
  status_code?: number
  extra?: Record<string, unknown>
}

const recentKeys = new Map<string, number>()
const DEDUP_MS = 30_000
let backendDownUntil = 0

function shouldSkip(message: string): boolean {
  const msg = message.toLowerCase()
  return (
    msg.includes('resizeobserver loop') ||
    msg === 'script error.' ||
    msg.includes('abort') ||
    msg.includes('the user aborted') ||
    msg.includes('security error') ||
    msg.includes('file:///') ||
    msg.includes('may not load or link to file')
  )
}

function sanitizeStack(stack?: string): string | undefined {
  if (!stack) return stack
  return stack.replace(/file:\/\/\/[^\s)]+/gi, '[local-file]')
}

function recentlyReported(key: string): boolean {
  const now = Date.now()
  const last = recentKeys.get(key)
  if (last && now - last < DEDUP_MS) return true
  recentKeys.set(key, now)
  if (recentKeys.size > 50) {
    const oldest = [...recentKeys.entries()].sort((a, b) => a[1] - b[1])[0]
    if (oldest) recentKeys.delete(oldest[0])
  }
  return false
}

/** Call when API network fails — limits duplicate "server down" reports. */
export function markBackendUnreachable(): void {
  backendDownUntil = Date.now() + 60_000
}

/** Fire-and-forget client error capture. Never throws. */
export function reportClientError(payload: ErrorReportPayload): void {
  try {
    if (Date.now() < backendDownUntil && payload.message.includes('اتصال')) return
    const message = (payload.message || '').trim()
    if (!message || shouldSkip(message)) return
    const key = `${payload.status_code ?? ''}|${payload.path ?? ''}|${message.slice(0, 200)}`
    if (recentlyReported(key)) return

    const token = useAuthStore.getState().token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    void fetch('/api/errors', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: payload.source ?? 'frontend',
        message: message.slice(0, 2000),
        stack: sanitizeStack(payload.stack)?.slice(0, 8000),
        path: payload.path?.slice(0, 500),
        method: payload.method,
        status_code: payload.status_code,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        app_version: APP_VERSION,
        extra: payload.extra ?? {},
      }),
    }).catch(() => {})
  } catch {
    /* never break the app because reporting failed */
  }
}
