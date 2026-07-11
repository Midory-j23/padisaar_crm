import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { accountsApi } from '@/api/accounts'
import { activitiesApi } from '@/api/activities'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { JalaliDateRangePicker } from '@/components/ui/JalaliDateRangePicker'
import { Select } from '@/components/ui/Select'
import ActivityFeed from '@/components/shared/ActivityFeed'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import ActivityDetailDrawer from './ActivityDetailDrawer'
import ActivityFormModal from './ActivityFormModal'
import { fa } from '@/lib/i18n/fa'
import { jalaliStringToISO } from '@/lib/utils/jalali'
import { toPersianDigits } from '@/lib/utils/persian'
import { usePermissions } from '@/hooks/usePermissions'
import type { Account, Activity, UserOption } from '@/types'

export default function ActivitiesPage() {
  const { isManager } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [overdueCount, setOverdueCount] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [activityType, setActivityType] = useState('')
  const [accountId, setAccountId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)

  useEffect(() => {
    accountsApi.list({ per_page: 100 }).then(({ data }) => setAccounts(data.items)).catch(() => {})
    if (isManager) authApi.listUsers().then(({ data }) => setUsers(data)).catch(() => {})
    activitiesApi.overdueCount().then(({ data }) => setOverdueCount(data.count)).catch(() => {})
  }, [isManager])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setDrawerId(id)
  }, [searchParams])

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      if (showOverdueOnly) {
        const { data } = await activitiesApi.overdue()
        setActivities(data.items)
        setTotal(data.count)
        setOverdueCount(data.count)
      } else {
        const { data } = await activitiesApi.list({
          page,
          per_page: 20,
          activity_type: activityType || undefined,
          account_id: accountId || undefined,
          assigned_to: assignedTo || undefined,
          from_date: fromDate ? jalaliStringToISO(fromDate) ?? undefined : undefined,
          to_date: toDate ? jalaliStringToISO(toDate, true) ?? undefined : undefined,
        })
        setActivities(data.items)
        setTotal(data.total)
      }
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [page, activityType, accountId, assignedTo, fromDate, toDate, showOverdueOnly])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const refresh = () => {
    fetchActivities()
    activitiesApi.overdueCount().then(({ data }) => setOverdueCount(data.count)).catch(() => {})
  }

  const perPage = 20
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="space-y-4">
      {overdueCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{fa.activities.overdueBanner(overdueCount)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowOverdueOnly(true); setPage(1) }}
          >
            {fa.activities.viewOverdue}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={activityType} onChange={(e) => { setActivityType(e.target.value); setPage(1) }} className="w-40">
            <option value="">{fa.activities.type}</option>
            {Object.entries(fa.enums.activity_type).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1) }} className="w-44">
            <option value="">{fa.activities.account}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          {isManager && (
            <Select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setPage(1) }} className="w-40">
              <option value="">کارشناس</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          )}
          <JalaliDateRangePicker
            from={fromDate || null}
            to={toDate || null}
            onChange={(f, t) => {
              setFromDate(f ?? '')
              setToDate(t ?? '')
              setPage(1)
            }}
          />
          {showOverdueOnly && (
            <Button variant="ghost" size="sm" onClick={() => setShowOverdueOnly(false)}>
              نمایش همه
            </Button>
          )}
        </div>
        <Button onClick={() => { setEditActivity(null); setModalOpen(true) }}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addActivity}
        </Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : activities.length === 0 ? (
          <EmptyState
            title={fa.empty.activities}
            action={<Button onClick={() => setModalOpen(true)}>{fa.actions.addActivity}</Button>}
          />
        ) : (
          <ActivityFeed activities={activities} onSelect={setDrawerId} />
        )}
        {!loading && total > 0 && (
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-500">{fa.pagination.showing(from, to, total)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {fa.pagination.prev} →
              </Button>
              <span className="text-sm">{toPersianDigits(page)}</span>
              <Button variant="outline" size="sm" disabled={page * perPage >= total} onClick={() => setPage((p) => p + 1)}>
                ← {fa.pagination.next}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ActivityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        activity={editActivity}
        onSuccess={refresh}
      />

      <ActivityDetailDrawer
        activityId={drawerId}
        onClose={() => {
          setDrawerId(null)
          if (searchParams.has('id')) {
            const next = new URLSearchParams(searchParams)
            next.delete('id')
            setSearchParams(next)
          }
        }}
        onUpdated={refresh}
        onEdit={(a) => { setDrawerId(null); setEditActivity(a); setModalOpen(true) }}
      />
    </div>
  )
}
