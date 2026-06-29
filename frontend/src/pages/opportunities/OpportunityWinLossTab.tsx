import { useEffect, useState } from 'react'
import { winLossApi } from '@/api/winLoss'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSkeleton } from '@/components/shared/SharedComponents'
import WinLossModal from '@/components/WinLossModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatCurrencyFaShort } from '@/lib/utils/persian'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import type { SalesStage, WinLossRecord } from '@/types'

function statusBadgeVariant(status: string): 'green' | 'red' | 'gray' {
  if (status === 'WON') return 'green'
  if (status === 'LOST') return 'red'
  return 'gray'
}

interface OpportunityWinLossTabProps {
  opportunityId: string
  salesStage: SalesStage
  hasWinLoss: boolean
  isClosed: boolean
  onUpdated: () => void
}

export default function OpportunityWinLossTab({
  opportunityId,
  salesStage,
  hasWinLoss,
  isClosed,
  onUpdated,
}: OpportunityWinLossTabProps) {
  const [analysis, setAnalysis] = useState<WinLossRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (hasWinLoss) {
      setLoading(true)
      winLossApi
        .list({ opportunity_id: opportunityId, per_page: 1 })
        .then(({ data }) => setAnalysis(data.items[0] ?? null))
        .finally(() => setLoading(false))
    } else {
      setAnalysis(null)
    }
  }, [hasWinLoss, opportunityId])

  if (!isClosed) {
    return <p className="py-8 text-center text-gray-500">فرصت هنوز بسته نشده است.</p>
  }

  if (loading) return <LoadingSkeleton rows={3} />

  if (analysis) {
    return (
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-gray-500">{fa.winLoss.status}</dt>
          <dd className="mt-1">
            <Badge variant={statusBadgeVariant(analysis.final_status)}>
              {enumLabel('final_status', analysis.final_status)}
            </Badge>
          </dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-gray-500">{fa.winLoss.reason}</dt>
          <dd className="mt-1 font-medium">{enumLabel('result_reason', analysis.result_reason)}</dd>
        </div>
        {analysis.final_contract_value != null && (
          <div className="rounded-lg border p-4">
            <dt className="text-xs text-gray-500">{fa.opportunities.winLoss.contractValue}</dt>
            <dd className="mt-1 font-medium">
              {formatCurrencyFaShort(Number(analysis.final_contract_value))}
            </dd>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-gray-500">{fa.winLoss.analyzedAt}</dt>
          <dd className="mt-1">{toJalaliDateTime(analysis.analyzed_at)}</dd>
        </div>
        {analysis.lessons_learned && (
          <div className="rounded-lg border p-4 sm:col-span-2">
            <dt className="text-xs text-gray-500">{fa.opportunities.winLoss.lessons}</dt>
            <dd className="mt-1 text-sm leading-relaxed">{analysis.lessons_learned}</dd>
          </div>
        )}
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-gray-500">{fa.winLoss.analyzedBy}</dt>
          <dd className="mt-1">{analysis.analyzed_by_name ?? '—'}</dd>
        </div>
      </dl>
    )
  }

  return (
    <div className="space-y-3 py-8 text-center">
      <p className="text-gray-600">{fa.confirm.closeWon}</p>
      <Button onClick={() => setModalOpen(true)}>ثبت تحلیل برد/باخت</Button>
      <WinLossModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        opportunityId={opportunityId}
        targetStage={salesStage}
        onComplete={() => { setModalOpen(false); onUpdated() }}
      />
    </div>
  )
}
