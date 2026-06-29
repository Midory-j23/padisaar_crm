import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronDown, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { opportunitiesApi } from '@/api/opportunities'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import WinLossModal from '@/components/WinLossModal'
import EntityActivitiesTab from '@/components/shared/EntityActivitiesTab'
import { LoadingSkeleton } from '@/components/shared/SharedComponents'
import OpportunityFormModal from './OpportunityFormModal'
import OpportunityWinLossTab from './OpportunityWinLossTab'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { CLOSED_STAGES, probabilityColor } from '@/lib/opportunityConstants'
import { formatCurrencyFaShort, toPersianDigits } from '@/lib/utils/persian'
import { toJalali, toJalaliDateTime } from '@/lib/utils/jalali'
import type { OpportunityDetail, SalesStage } from '@/types'

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [opp, setOpp] = useState<OpportunityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('summary')
  const [editOpen, setEditOpen] = useState(false)
  const [closeMenu, setCloseMenu] = useState(false)
  const [winLossOpen, setWinLossOpen] = useState(false)
  const [closeStage, setCloseStage] = useState<SalesStage | null>(null)

  const fetchOpp = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await opportunitiesApi.get(id)
      setOpp(data)
    } catch {
      toast.error('فرصت یافت نشد')
      navigate('/opportunities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpp()
  }, [id])

  const handleCloseStage = async (stage: SalesStage) => {
    setCloseMenu(false)
    if (!opp) return
    setCloseStage(stage)
    setWinLossOpen(true)
  }

  const handleWinLossComplete = async () => {
    if (!opp || !closeStage) return
    try {
      await opportunitiesApi.update(opp.id, { sales_stage: closeStage })
      await fetchOpp()
    } catch {
      toast.error(fa.toast.error)
    }
    setCloseStage(null)
  }

  const tabs = [
    { id: 'summary', label: fa.opportunities.tabs.summary },
    { id: 'activities', label: fa.opportunities.tabs.activities },
    { id: 'winloss', label: fa.opportunities.tabs.winLoss },
  ]

  if (loading || !opp) return <LoadingSkeleton rows={6} />

  const fields = [
    { label: fa.opportunities.oppTitle, value: opp.title },
    { label: fa.opportunities.account, value: opp.account_name ?? '—' },
    { label: fa.opportunities.projectType, value: enumLabel('project_type', opp.project_type) },
    { label: fa.opportunities.stage, value: enumLabel('sales_stage', opp.sales_stage) },
    { label: fa.opportunities.value, value: formatCurrencyFaShort(opp.estimated_value ? Number(opp.estimated_value) : null) },
    {
      label: fa.opportunities.probability,
      value: (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full ${probabilityColor(opp.probability)}`} style={{ width: `${opp.probability}%` }} />
          </div>
          {toPersianDigits(opp.probability)}٪
        </div>
      ),
    },
    { label: fa.opportunities.leadSource, value: enumLabel('lead_source', opp.lead_source) },
    {
      label: fa.opportunities.closeDate,
      value: (
        <span className={opp.is_overdue ? 'text-red-600' : ''}>
          {toJalali(opp.expected_close_date)}
          {opp.is_overdue && ' — معوق'}
        </span>
      ),
    },
    { label: fa.opportunities.assignedTo, value: opp.assigned_to_name ?? '—' },
    {
      label: fa.opportunities.competitors,
      value: opp.competitors?.length ? opp.competitors.join('، ') : '—',
    },
  ]

  const isClosed = CLOSED_STAGES.includes(opp.sales_stage as typeof CLOSED_STAGES[number])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/opportunities')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{opp.title}</h2>
              <Badge variant="blue">{enumLabel('sales_stage', opp.sales_stage)}</Badge>
              <Badge>{toPersianDigits(opp.probability)}٪</Badge>
              {opp.pending_win_loss && <Badge variant="yellow">{fa.opportunities.pendingAnalysis}</Badge>}
            </div>
            <p className="text-sm text-gray-500">{opp.account_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isClosed && (
            <div className="relative">
              <Button variant="outline" onClick={() => setCloseMenu(!closeMenu)}>
                {fa.opportunities.closeOpportunity}
                <ChevronDown className="mr-1 h-4 w-4" />
              </Button>
              {closeMenu && (
                <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg">
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-50" onClick={() => handleCloseStage('CLOSED_WON')}>
                    موفق ✓
                  </button>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-50" onClick={() => handleCloseStage('CLOSED_LOST')}>
                    ناموفق ✗
                  </button>
                  <button type="button" className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-50" onClick={() => handleCloseStage('ABANDONED')}>
                    متوقف شده
                  </button>
                </div>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="ml-1 h-4 w-4" />
            {fa.actions.edit}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </CardHeader>
        <CardContent>
          {tab === 'summary' && (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gray-100 p-4">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {opp.stage_history.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold">تاریخچه مراحل</h3>
                  <div className="space-y-3 border-r-2 border-primary/20 pr-4">
                    {opp.stage_history.map((h) => (
                      <div key={h.id} className="relative">
                        <div className="absolute -right-[21px] top-1 h-3 w-3 rounded-full bg-primary" />
                        <p className="text-sm font-medium">
                          {h.from_stage ? enumLabel('sales_stage', h.from_stage) : '—'}
                          {' → '}
                          {enumLabel('sales_stage', h.to_stage)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {h.changed_by_name} — {toJalaliDateTime(h.changed_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'activities' && opp && (
            <EntityActivitiesTab accountId={opp.account_id} opportunityId={opp.id} lockAccount />
          )}
          {tab === 'winloss' && opp && (
            <OpportunityWinLossTab
              opportunityId={opp.id}
              salesStage={opp.sales_stage}
              hasWinLoss={opp.has_win_loss}
              isClosed={isClosed}
              onUpdated={fetchOpp}
            />
          )}
        </CardContent>
      </Card>

      <OpportunityFormModal open={editOpen} onOpenChange={setEditOpen} opportunity={opp} onSuccess={fetchOpp} />

      {closeStage && (
        <WinLossModal
          open={winLossOpen}
          onOpenChange={setWinLossOpen}
          opportunityId={opp.id}
          targetStage={closeStage}
          onComplete={handleWinLossComplete}
        />
      )}
    </div>
  )
}
