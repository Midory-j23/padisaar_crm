import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { winLossApi } from '@/api/winLoss'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatCurrencyFaShort, formatPercentFa, toPersianDigits } from '@/lib/utils/persian'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import type { LessonCard, WinLossRecord, WinLossSummary } from '@/types'

function statusBadgeVariant(status: string): 'green' | 'red' | 'gray' {
  if (status === 'WON') return 'green'
  if (status === 'LOST') return 'red'
  return 'gray'
}

export default function WinLossPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('records')
  const [summary, setSummary] = useState<WinLossSummary | null>(null)
  const [records, setRecords] = useState<WinLossRecord[]>([])
  const [lessons, setLessons] = useState<LessonCard[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [reason, setReason] = useState('')
  const [lessonSearch, setLessonSearch] = useState('')
  const [debouncedLessonSearch, setDebouncedLessonSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLessonSearch(lessonSearch), 400)
    return () => clearTimeout(t)
  }, [lessonSearch])

  const fetchSummary = useCallback(async () => {
    const { data } = await winLossApi.summary()
    setSummary(data)
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await winLossApi.list({
        page,
        per_page: 20,
        status: status || undefined,
        reason: reason || undefined,
      })
      setRecords(data.items)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [page, status, reason])

  const fetchLessons = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await winLossApi.lessons({
        search: debouncedLessonSearch || undefined,
        per_page: 50,
      })
      setLessons(data.items)
    } finally {
      setLoading(false)
    }
  }, [debouncedLessonSearch])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    if (tab === 'records') fetchRecords()
    else fetchLessons()
  }, [tab, fetchRecords, fetchLessons])

  const tabs = [
    { id: 'records', label: fa.winLoss.tabs.records },
    { id: 'lessons', label: fa.winLoss.tabs.lessons },
  ]

  const perPage = 20
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary">{fa.winLoss.title}</h2>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500">{fa.winLoss.winRate}</p>
              <p className="mt-1 text-2xl font-bold text-green-700">
                {formatPercentFa(summary.win_rate)}
              </p>
              <p className="text-xs text-gray-400">
                {toPersianDigits(summary.total_won)} برد / {toPersianDigits(summary.total_closed)} کل
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500">{fa.winLoss.avgCycle}</p>
              <p className="mt-1 text-2xl font-bold">
                {summary.avg_cycle_days != null
                  ? `${toPersianDigits(Math.round(summary.avg_cycle_days))} ${fa.winLoss.days}`
                  : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500">{fa.winLoss.totalWonValue}</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {formatCurrencyFaShort(summary.total_won_value ? Number(summary.total_won_value) : null)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-gray-500">{fa.winLoss.topLossReason}</p>
              <p className="mt-1 text-lg font-bold">
                {summary.top_loss_reason
                  ? enumLabel('result_reason', summary.top_loss_reason)
                  : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === 'records' && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="w-40">
                  <option value="">{fa.winLoss.status}</option>
                  {Object.entries(fa.enums.final_status).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
                <Select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1) }} className="w-44">
                  <option value="">{fa.winLoss.reason}</option>
                  {Object.entries(fa.enums.result_reason).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
              {loading ? (
                <LoadingSkeleton rows={6} />
              ) : records.length === 0 ? (
                <EmptyState title={fa.empty.search_results} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">فرصت</th>
                        <th className="px-4 py-3">سازمان</th>
                        <th className="px-4 py-3">{fa.winLoss.status}</th>
                        <th className="px-4 py-3">{fa.winLoss.reason}</th>
                        <th className="px-4 py-3">ارزش قرارداد</th>
                        <th className="px-4 py-3">{fa.winLoss.analyzedAt}</th>
                        <th className="px-4 py-3">{fa.winLoss.analyzedBy}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr
                          key={r.id}
                          className="cursor-pointer border-b hover:bg-gray-50"
                          onClick={() => navigate(`/opportunities/${r.opportunity_id}`)}
                        >
                          <td className="px-4 py-3 font-medium">{r.opportunity_title}</td>
                          <td className="px-4 py-3">{r.account_name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={statusBadgeVariant(r.final_status)}>
                              {enumLabel('final_status', r.final_status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{enumLabel('result_reason', r.result_reason)}</td>
                          <td className="px-4 py-3">
                            {formatCurrencyFaShort(r.final_contract_value ? Number(r.final_contract_value) : null)}
                          </td>
                          <td className="px-4 py-3">{toJalaliDateTime(r.analyzed_at)}</td>
                          <td className="px-4 py-3">{r.analyzed_by_name ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && total > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-500">{fa.pagination.showing(from, to, total)}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'lessons' && (
            <div className="mt-4 space-y-4">
              <Input
                placeholder={`${fa.actions.search} درس‌آموخته...`}
                value={lessonSearch}
                onChange={(e) => setLessonSearch(e.target.value)}
                className="max-w-md"
              />
              {loading ? (
                <LoadingSkeleton rows={4} />
              ) : lessons.length === 0 ? (
                <EmptyState title={fa.winLoss.noLessons} />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {lessons.map((l) => (
                    <div key={l.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant={statusBadgeVariant(l.final_status)}>
                          {enumLabel('final_status', l.final_status)}
                        </Badge>
                        <span className="text-xs text-gray-500">{toJalaliDateTime(l.analyzed_at)}</span>
                      </div>
                      <p className="font-medium">{l.opportunity_title}</p>
                      <p className="text-sm text-gray-500">{l.account_name}</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-700">{l.lessons_learned}</p>
                      {l.analyzed_by_name && (
                        <p className="mt-2 text-xs text-gray-400">{l.analyzed_by_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
