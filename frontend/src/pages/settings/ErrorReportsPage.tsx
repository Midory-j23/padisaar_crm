import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { errorsApi, type ErrorReport } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { fa } from '@/lib/i18n/fa'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import { timeAgoFa, toPersianDigits } from '@/lib/utils/persian'

function sanitizeStackText(stack?: string | null): string {
  if (!stack) return ''
  return stack.replace(/file:\/\/\/[^\s)]+/gi, '[local-file]')
}

function StackPreview({ stack }: { stack?: string | null }) {
  const [open, setOpen] = useState(false)
  if (!stack) return <span className="text-xs text-gray-400">—</span>
  const safeStack = sanitizeStackText(stack)
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {fa.settings.errorDetails}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 text-left text-[11px] text-gray-700" dir="ltr">
          {safeStack}
        </pre>
      )}
    </div>
  )
}

export default function ErrorReportsPage() {
  const location = useLocation()
  const [items, setItems] = useState<ErrorReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('open')
  const [source, setSource] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)

  const sendTestError = async () => {
    setSendingTest(true)
    try {
      await errorsApi.create({
        source: 'frontend',
        message: 'خطای آزمایشی CRM',
        stack: 'Test stack trace\n  at ErrorReportsPage (manual test)',
        path: window.location.pathname,
      })
      toast.success(fa.settings.testErrorSent)
      await fetchErrors(true)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setSendingTest(false)
    }
  }

  const fetchErrors = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const { data } = await errorsApi.list({
          page,
          per_page: 20,
          status: status || undefined,
          source: source || undefined,
        })
        setItems(data.items)
        setTotal(data.total)
      } catch {
        toast.error(fa.toast.error)
        setItems([])
        setTotal(0)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [page, status, source],
  )

  useEffect(() => {
    fetchErrors()
  }, [fetchErrors, location.key])

  const resolve = async (id: string) => {
    setResolvingId(id)
    try {
      await errorsApi.resolve(id)
      toast.success(fa.settings.errorResolved)
      await fetchErrors(true)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setResolvingId(null)
    }
  }

  const perPage = 20
  const totalPages = Math.ceil(total / perPage) || 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600">{fa.settings.errorsHint}</p>
          {!loading && (
            <p className="mt-1 text-sm text-gray-700">
              {toPersianDigits(total)} {fa.settings.errorsCount}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendTestError} disabled={sendingTest}>
            {fa.settings.sendTestError}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchErrors(true)} disabled={refreshing}>
          <RefreshCw className={`ml-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {fa.actions.refresh}
        </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="w-40"
        >
          <option value="open">{fa.settings.errorStatusOpen}</option>
          <option value="resolved">{fa.settings.errorStatusResolved}</option>
          <option value="">{fa.settings.errorStatusAll}</option>
        </Select>
        <Select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">{fa.settings.errorSourceAll}</option>
          <option value="frontend">{fa.settings.errorSourceFrontend}</option>
          <option value="backend">{fa.settings.errorSourceBackend}</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={8} />
          ) : items.length === 0 ? (
            <EmptyState title={fa.settings.errorsEmpty} hint={fa.settings.errorsEmptyHint} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditTime}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.errorSource}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.errorMessage}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.errorUser}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.errorCount}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.errorStatus}</th>
                    <th className="px-4 py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-mono text-xs">{toJalaliDateTime(row.last_seen_at, true)}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{timeAgoFa(row.last_seen_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={row.source === 'backend' ? 'red' : 'orange'}>
                          {row.source === 'backend'
                            ? fa.settings.errorSourceBackend
                            : fa.settings.errorSourceFrontend}
                        </Badge>
                        {row.path && (
                          <span className="mt-1 block max-w-[160px] truncate text-[11px] text-gray-500" dir="ltr">
                            {row.method ? `${row.method} ` : ''}
                            {row.path}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-md break-words text-gray-800">{row.message}</p>
                        <div className="mt-1">
                          <StackPreview stack={row.stack} />
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.user_name ?? '—'}</td>
                      <td className="px-4 py-3">{toPersianDigits(row.occurrence_count)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={row.status === 'open' ? 'red' : 'green'}>
                          {row.status === 'open'
                            ? fa.settings.errorStatusOpen
                            : fa.settings.errorStatusResolved}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'open' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resolvingId === row.id}
                            onClick={() => resolve(row.id)}
                          >
                            <Check className="ml-1 h-4 w-4" />
                            {fa.settings.markResolved}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {fa.pagination.showing((page - 1) * perPage + 1, Math.min(page * perPage, total), total)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {fa.pagination.prev}
            </Button>
            <span className="flex items-center text-sm">{toPersianDigits(page)}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {fa.pagination.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
