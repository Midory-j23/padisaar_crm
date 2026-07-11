import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { reportsApi } from '@/api/reports'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { JalaliDateRangePicker } from '@/components/ui/JalaliDateRangePicker'
import { Select } from '@/components/ui/Select'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { jalaliStringToISO } from '@/lib/utils/jalali'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import type { Activity } from '@/types'

export default function ActivitiesReportPage() {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activityType, setActivityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await reportsApi.activities({
        activity_type: activityType || undefined,
        from_date: fromDate ? jalaliStringToISO(fromDate) ?? undefined : undefined,
        to_date: toDate ? jalaliStringToISO(toDate, true) ?? undefined : undefined,
      })
      setItems(data.items)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [activityType, fromDate, toDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = async () => {
    setExporting(true)
    try {
      await reportsApi.exportActivities()
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
      await reportsApi.exportActivitiesPdf({
        activity_type: activityType || undefined,
        from_date: fromDate ? jalaliStringToISO(fromDate) ?? undefined : undefined,
        to_date: toDate ? jalaliStringToISO(toDate, true) ?? undefined : undefined,
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
          <Select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-44">
            <option value="">{fa.reports.allTypes}</option>
            {Object.keys(fa.enums.activity_type).map((k) => (
              <option key={k} value={k}>
                {enumLabel('activity_type', k)}
              </option>
            ))}
          </Select>
          <JalaliDateRangePicker
            from={fromDate || null}
            to={toDate || null}
            onChange={(f, t) => {
              setFromDate(f ?? '')
              setToDate(t ?? '')
            }}
          />
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
                    <th className="px-4 py-3 text-right font-medium">{fa.activities.type}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.activities.date}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.accounts.name}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.opportunities.oppTitle}</th>
                    <th className="px-4 py-3 text-right font-medium">{fa.activities.createdBy}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-3">{enumLabel('activity_type', a.activity_type)}</td>
                      <td className="px-4 py-3">{toJalaliDateTime(a.activity_date)}</td>
                      <td className="px-4 py-3">{a.account_name}</td>
                      <td className="px-4 py-3">{a.opportunity_title ?? '—'}</td>
                      <td className="px-4 py-3">{a.created_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
