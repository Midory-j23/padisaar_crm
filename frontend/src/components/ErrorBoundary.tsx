import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { fa } from '@/lib/i18n/fa'
import { reportClientError } from '@/lib/errorReporter'

interface Props {
  children: ReactNode
  compact?: boolean
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || fa.errors.server_error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      source: 'frontend',
      message: error.message || 'React render error',
      stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}`,
      path: window.location.pathname,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const inner = (
        <div className="mx-auto max-w-md rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <p className="text-5xl font-bold text-red-500">!</p>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{fa.errors.crashTitle}</h1>
          <p className="mt-2 text-sm text-gray-500">{fa.errors.crashHint}</p>
          <p className="mt-3 break-all rounded bg-slate-50 p-2 text-left text-xs text-gray-400" dir="ltr">
            {this.state.message}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={this.handleReload}>
              {fa.errors.reload}
            </Button>
            <Button onClick={this.handleHome}>{fa.errors.backToDashboard}</Button>
          </div>
        </div>
      )
      if (this.props.compact) {
        return <div className="flex min-h-[50vh] items-center justify-center px-4">{inner}</div>
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
          {inner}
        </div>
      )
    }
    return this.props.children
  }
}
