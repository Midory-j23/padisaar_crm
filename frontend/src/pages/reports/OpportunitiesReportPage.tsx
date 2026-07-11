import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatCurrencyFaShort, toPersianDigits } from '@/lib/utils/persian'
import type { Opportunity } from '@/types'

export default function OpportunitiesReportPage() {
  const [items, setItems] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await reportsApi.opportunities({
        search: search || undefined,
        stage: stage || undefined,
      })
      setItems(data.items)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [search, stage])

  useEffect(() => {
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleExport = async () => {
    setExporting(true)
    try {
      await reportsApi.exportOpportunities()
      toast.success(fa.reports.exportSuccess)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await reportsApi.exportOpportunitiesPdf({
        search: search || undefined,
        stage: stage || undefined,
      })
      toast.success(fa.reports.exportPdfSuccess)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={fa.actions.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-44">
            <option value="">{fa.reports.allStages}</option>
            {Object.keys(fa.enums.sales_stage).map((k) => (
              <option key={k} value={k}>
                {enumLabel('sales_stage', k)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="ml-1 h-4 w-4" />
            {fa.actions.export}
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
            <Download className="ml-1 h-4 w-4" />
            {fa.actions.exportPdf}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : items.length === 0 ? (
            <EmptyState title={fa.empty.search_results} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.oppTitle}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.accounts.name}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.stage}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.value}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.probability}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.assignedTo}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-3">{o.title}</td>
                      <td className="px-4 py-3">{o.account_name}</td>
                      <td className="px-4 py-3">{enumLabel('sales_stage', o.sales_stage)}</td>
                      <td className="px-4 py-3">{formatCurrencyFaShort(o.estimated_value)}</td>
                      <td className="px-4 py-3">{toPersianDigits(o.probability)}٪</td>
                      <td className="px-4 py-3">{o.assigned_to_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && items.length > 0 && (
            <p className="border-t px-4 py-2 text-xs text-gray-500">
              {fa.pagination.showing(1, items.length, items.length)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
