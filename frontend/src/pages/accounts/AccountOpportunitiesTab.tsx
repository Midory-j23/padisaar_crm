import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { opportunitiesApi } from '@/api/opportunities'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import OpportunityFormModal from '@/pages/opportunities/OpportunityFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatCurrencyFaShort } from '@/lib/utils/persian'
import type { Opportunity } from '@/types'

interface AccountOpportunitiesTabProps {
  accountId: string
}

export default function AccountOpportunitiesTab({ accountId }: AccountOpportunitiesTabProps) {
  const navigate = useNavigate()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await opportunitiesApi.list({ account_id: accountId, per_page: 100 })
      setOpportunities(data.items)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addOpportunity}
        </Button>
      </div>
      {opportunities.length === 0 ? (
        <EmptyState
          title={fa.empty.opportunities}
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              {fa.actions.addOpportunity}
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3">{fa.opportunities.oppTitle}</th>
                <th className="px-4 py-3">{fa.opportunities.stage}</th>
                <th className="px-4 py-3">{fa.opportunities.value}</th>
                <th className="px-4 py-3">{fa.opportunities.probability}</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b hover:bg-gray-50"
                  onClick={() => navigate(`/opportunities/${o.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{o.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="blue">{enumLabel('sales_stage', o.sales_stage)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrencyFaShort(o.estimated_value ? Number(o.estimated_value) : null)}
                  </td>
                  <td className="px-4 py-3">{o.probability}٪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <OpportunityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultAccountId={accountId}
        lockAccount
        onSuccess={fetchOpportunities}
      />
    </div>
  )
}
