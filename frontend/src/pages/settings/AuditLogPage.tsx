import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { reportsApi } from '@/api/reports'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { JalaliDateRangePicker } from '@/components/ui/JalaliDateRangePicker'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { jalaliStringToISO, toJalaliDateTime } from '@/lib/utils/jalali'
import { timeAgoFa, toPersianDigits } from '@/lib/utils/persian'
import type { AuditLogEntry, UserOption } from '@/types'

const ENTITY_TYPES = ['Account', 'Contact', 'Opportunity', 'Activity', 'User', 'WinLoss'] as const

function entityLabel(type: string): string {
  const labels = fa.enums.entity_type as Record<string, string>
  return labels[type] ?? type
}

function formatStage(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '')
  return fa.enums.sales_stage[value as keyof typeof fa.enums.sales_stage] ?? value
}

function ChangeDiff({ data, action }: { data: Record<string, unknown>; action: string }) {
  const [open, setOpen] = useState(false)
  const before = data.before as Record<string, unknown> | undefined
  const after = data.after as Record<string, unknown> | undefined
  const snapshot = !before && !after ? data : null

  if (!before && !after && Object.keys(data).length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  const formatValue = (key: string, value: unknown) =>
    key === 'sales_stage' ? formatStage(value) : JSON.stringify(value)

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {action === 'DELETE' ? 'حذف شده' : 'جزئیات'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded bg-slate-50 p-2 text-xs">
          {before && (
            <div>
              <p className="font-medium text-gray-600">قبل:</p>
              <pre className="whitespace-pre-wrap break-all text-gray-700">
                {Object.entries(before)
                  .map(([k, v]) => `${k}: ${formatValue(k, v)}`)
                  .join('\n')}
              </pre>
            </div>
          )}
          {after && (
            <div>
              <p className="font-medium text-gray-600">بعد:</p>
              <pre className="whitespace-pre-wrap break-all text-gray-700">
                {Object.entries(after)
                  .map(([k, v]) => `${k}: ${formatValue(k, v)}`)
                  .join('\n')}
              </pre>
            </div>
          )}
          {snapshot && Object.keys(snapshot).length > 0 && (
            <div>
              <p className="font-medium text-gray-600">داده:</p>
              <pre className="whitespace-pre-wrap break-all text-gray-700">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AuditLogPage() {
  const location = useLocation()
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])

  const hasFilters = Boolean(entityType || action || userId || fromDate || toDate)

  useEffect(() => {
    authApi.listUsers().then(({ data }) => setUsers(data)).catch(() => {})
  }, [])

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const { data } = await reportsApi.auditLog({
          page,
          per_page: 20,
          entity_type: entityType || undefined,
          action: action || undefined,
          user_id: userId || undefined,
          from_date: fromDate ? jalaliStringToISO(fromDate) ?? undefined : undefined,
          to_date: toDate ? jalaliStringToISO(toDate, true) ?? undefined : undefined,
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
    [page, entityType, action, userId, fromDate, toDate],
  )

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs, location.key])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchLogs(true)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchLogs])

  const clearFilters = () => {
    setEntityType('')
    setAction('')
    setUserId('')
    setFromDate(null)
    setToDate(null)
    setPage(1)
  }

  const perPage = 20
  const totalPages = Math.ceil(total / perPage) || 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">{fa.settings.auditTimezone}</p>
          {!loading && (
            <p className="mt-1 text-sm text-gray-700">
              {toPersianDigits(total)} رویداد ثبت شده
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {fa.settings.clearFilters}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchLogs(true)} disabled={refreshing}>
            <RefreshCw className={`ml-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {fa.settings.refreshAudit}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value)
            setPage(1)
          }}
          className="w-40"
        >
          <option value="">{fa.settings.allEntities}</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>
              {entityLabel(e)}
            </option>
          ))}
        </Select>
        <Select
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
          className="w-36"
        >
          <option value="">{fa.settings.allActions}</option>
          {Object.keys(fa.enums.audit_action).map((k) => (
            <option key={k} value={k}>
              {enumLabel('audit_action', k)}
            </option>
          ))}
        </Select>
        <Select
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            setPage(1)
          }}
          className="w-44"
        >
          <option value="">همه کاربران</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>

      <JalaliDateRangePicker
        from={fromDate}
        to={toDate}
        onChange={(from, to) => {
          setFromDate(from)
          setToDate(to)
          setPage(1)
        }}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={8} />
          ) : items.length === 0 ? (
            <EmptyState
              title={
                hasFilters
                  ? 'رویدادی با این فیلترها یافت نشد.'
                  : 'هنوز رویدادی ثبت نشده است.'
              }
              hint={hasFilters ? 'فیلترها را پاک کنید یا بازه تاریخ را تغییر دهید.' : undefined}
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {fa.settings.clearFilters}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditTime}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditUser}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditEntity}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditAction}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.settings.auditChanges}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id} className="border-t align-top">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-mono text-xs">{toJalaliDateTime(log.created_at, true)}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{timeAgoFa(log.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">{log.changed_by_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{entityLabel(log.entity_type)}</span>
                        {log.entity_summary && (
                          <span className="mt-0.5 block text-xs text-gray-700">{log.entity_summary}</span>
                        )}
                        <span className="block text-[10px] text-gray-400">{log.entity_id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3">{enumLabel('audit_action', log.action)}</td>
                      <td className="px-4 py-3">
                        <ChangeDiff data={log.change_data} action={log.action} />
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
