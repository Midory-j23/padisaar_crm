import { useEffect } from 'react'
import { reportClientError } from '@/lib/errorReporter'

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        source: 'frontend',
        message: event.message || 'window.onerror',
        stack: event.error?.stack,
        path: window.location.pathname,
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      if (reason && typeof reason === 'object' && (reason as { isAxiosError?: boolean }).isAxiosError) {
        return
      }
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection'
      const stack = reason instanceof Error ? reason.stack : undefined
      reportClientError({
        source: 'frontend',
        message,
        stack,
        path: window.location.pathname,
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    if (import.meta.env.DEV) {
      ;(window as Window & { __crmReportTestError?: () => void }).__crmReportTestError = () => {
        reportClientError({
          source: 'frontend',
          message: 'خطای آزمایشی CRM',
          stack: 'Test stack trace\n  at ErrorReportsPage (test)',
          path: window.location.pathname,
        })
      }
    }

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      if (import.meta.env.DEV) {
        delete (window as Window & { __crmReportTestError?: () => void }).__crmReportTestError
      }
    }
  }, [])

  return null
}
