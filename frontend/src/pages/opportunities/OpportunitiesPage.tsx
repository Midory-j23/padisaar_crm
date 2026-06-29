import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { opportunitiesApi } from '@/api/opportunities'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog, EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import KanbanView from './KanbanView'
import OpportunityFormModal from './OpportunityFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { probabilityColor } from '@/lib/opportunityConstants'
import { formatCurrencyFaShort, toPersianDigits } from '@/lib/utils/persian'
import { toJalali } from '@/lib/utils/jalali'
import { usePermissions } from '@/hooks/usePermissions'
import type { Opportunity } from '@/types'

export default function OpportunitiesPage() {
  const navigate = useNavigate()
  const { canDelete } = usePermissions()
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchList = useCallback(async () => {
    if (view !== 'list') return
    setLoading(true)
    try {
      const { data } = await opportunitiesApi.list({
        page,
        per_page: 20,
        search: debouncedSearch || undefined,
        stage: stageFilter || undefined,
      })
      setOpportunities(data.items)
      setTotal(data.total)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [view, page, debouncedSearch, stageFilter])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const refresh = () => setRefreshKey((k) => k + 1)

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await opportunitiesApi.delete(deleteId)
      toast.success(fa.toast.deleteSuccess('فرصت'))
      setDeleteId(null)
      refresh()
      fetchList()
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setDeleting(false)
    }
  }

  const perPage = 20
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-white p-1">
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="ml-1 h-4 w-4" />
              کانبان
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="ml-1 h-4 w-4" />
              {fa.actions.listView}
            </Button>
          </div>
          {view === 'list' && (
            <>
              <Input
                placeholder={`${fa.actions.search}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-48"
              />
              <Select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
                className="w-44"
              >
                <option value="">{fa.opportunities.stage}</option>
                {Object.entries(fa.enums.sales_stage).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </>
          )}
        </div>
        <Button onClick={() => { setEditOpp(null); setModalOpen(true) }}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addOpportunity}
        </Button>
      </div>

      {view === 'kanban' ? (
        <KanbanView refreshKey={refreshKey} onRefresh={refresh} />
      ) : (
        <Card>
          {loading ? (
            <LoadingSkeleton rows={8} />
          ) : opportunities.length === 0 ? (
            <EmptyState title={fa.empty.opportunities} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">{fa.opportunities.operations}</th>
                    <th className="px-4 py-3">{fa.opportunities.oppTitle}</th>
                    <th className="px-4 py-3">{fa.opportunities.account}</th>
                    <th className="px-4 py-3">{fa.opportunities.stage}</th>
                    <th className="px-4 py-3">{fa.opportunities.value}</th>
                    <th className="px-4 py-3">{fa.opportunities.probability}</th>
                    <th className="px-4 py-3">{fa.opportunities.closeDate}</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o) => (
                    <tr
                      key={o.id}
                      className="cursor-pointer border-b hover:bg-gray-50"
                      onClick={() => navigate(`/opportunities/${o.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditOpp(o); setModalOpen(true) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(o.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {o.title}
                        {o.pending_win_loss && (
                          <Badge variant="yellow" className="mr-2">{fa.opportunities.pendingAnalysis}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">{o.account_name ?? '—'}</td>
                      <td className="px-4 py-3">{enumLabel('sales_stage', o.sales_stage)}</td>
                      <td className="px-4 py-3">{formatCurrencyFaShort(o.estimated_value ? Number(o.estimated_value) : null)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div className={`h-full ${probabilityColor(o.probability)}`} style={{ width: `${o.probability}%` }} />
                          </div>
                          <span>{toPersianDigits(o.probability)}٪</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${o.is_overdue ? 'text-red-600' : ''}`}>
                        {toJalali(o.expected_close_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <CardContent className="flex items-center justify-between border-t py-3">
              <span className="text-sm text-gray-500">{fa.pagination.showing(from, to, total)}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {fa.pagination.prev} →
                </Button>
                <span className="flex items-center text-sm">{toPersianDigits(page)}</span>
                <Button variant="outline" size="sm" disabled={page * perPage >= total} onClick={() => setPage((p) => p + 1)}>
                  ← {fa.pagination.next}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <OpportunityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        opportunity={editOpp}
        onSuccess={() => { refresh(); fetchList() }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="حذف فرصت"
        message={fa.confirm.deleteOpportunity}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
