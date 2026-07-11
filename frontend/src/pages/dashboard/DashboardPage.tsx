import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import ActivityFeed from '@/components/shared/ActivityFeed'
import { LoadingSkeleton } from '@/components/shared/SharedComponents'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { usePermissions } from '@/hooks/usePermissions'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalali, toJalaliDateTime } from '@/lib/utils/jalali'
import {
  formatCurrencyFaShort,
  formatPercentFa,
  toPersianDigits,
} from '@/lib/utils/persian'
import { useAuthStore } from '@/store/authStore'
import type {
  Activity,
  DashboardKpis,
  ExpertSummary,
  FunnelResponse,
  TeamPerformanceResponse,
  TrendsResponse,
} from '@/types'

const CHART_FONT = 'Vazirmatn, sans-serif'
const PIE_COLORS = ['#1e3a5f', '#2d5a9e', '#e11d48', '#f59e0b', '#10b981', '#6366f1']

type Period = 'week' | 'month' | 'quarter' | 'year'

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return toJalali(new Date(y, m - 1, 1))
}

function KpiCard({
  label,
  value,
  icon: Icon,
  alert,
  href,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  alert?: boolean
  href?: string
}) {
  const content = (
    <Card className={alert ? 'border-red-200 bg-red-50/50' : undefined}>
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            alert ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
  if (href) {
    return (
      <Link to={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    )
  }
  return content
}

function ManagerDashboard() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('month')
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null)
  const [team, setTeam] = useState<TeamPerformanceResponse | null>(null)
  const [trends, setTrends] = useState<TrendsResponse | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)

  const fetchKpis = useCallback(async () => {
    try {
      const { data } = await dashboardApi.kpis({ period })
      setKpis(data)
    } catch {
      toast.error(fa.toast.error)
    }
  }, [period])

  const fetchCharts = useCallback(async () => {
    try {
      const [funnelRes, teamRes, trendsRes, actRes] = await Promise.all([
        dashboardApi.funnel(),
        dashboardApi.teamPerformance(),
        dashboardApi.trends(),
        dashboardApi.recentActivities(10),
      ])
      setFunnel({ stages: funnelRes.data?.stages ?? [] })
      setTeam({ members: teamRes.data?.members ?? [] })
      setTrends({
        monthly_won: trendsRes.data?.monthly_won ?? [],
        loss_reasons: trendsRes.data?.loss_reasons ?? [],
      })
      setActivities(actRes.data?.items ?? [])
    } catch {
      setFunnel({ stages: [] })
      setTeam({ members: [] })
      setTrends({ monthly_won: [], loss_reasons: [] })
      setActivities([])
      toast.error(fa.toast.error)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([fetchCharts(), fetchKpis()]).finally(() => setLoading(false))
  }, [fetchCharts, fetchKpis])

  useEffect(() => {
    const interval = setInterval(fetchKpis, 60_000)
    return () => clearInterval(interval)
  }, [fetchKpis])

  const funnelChartData = useMemo(() => {
    if (!funnel?.stages) return []
    return funnel.stages.map((s, idx) => {
      const prev = idx > 0 ? funnel.stages[idx - 1] : null
      const conversion =
        prev && prev.count > 0 ? Math.round((s.count / prev.count) * 100) : null
      return {
        name: enumLabel('sales_stage', s.stage),
        count: s.count,
        value: Number(s.total_value) / 1_000_000,
        conversion,
      }
    })
  }, [funnel])

  const trendChartData = useMemo(
    () =>
      (trends?.monthly_won ?? []).map((p) => ({
        name: monthLabel(p.month),
        value: Number(p.won_value) / 1_000_000_000,
        count: p.won_count,
      })),
    [trends]
  )

  const lossPieData = useMemo(
    () =>
      (trends?.loss_reasons ?? []).map((r) => ({
        name: enumLabel('result_reason', r.reason),
        value: r.count,
      })),
    [trends]
  )

  const periodTabs = (['week', 'month', 'quarter', 'year'] as Period[]).map((p) => ({
    id: p,
    label: fa.dashboard.periods[p],
  }))

  if (loading) return <LoadingSkeleton rows={6} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-primary">{fa.dashboard.title}</h2>
        <Tabs tabs={periodTabs} active={period} onChange={(id) => setPeriod(id as Period)} />
      </div>

      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={fa.dashboard.pipeline_value}
            value={formatCurrencyFaShort(Number(kpis.weighted_pipeline_value))}
            icon={TrendingUp}
            href="/opportunities"
          />
          <KpiCard
            label={fa.dashboard.conversion_rate}
            value={formatPercentFa(kpis.conversion_rate)}
            icon={Target}
          />
          <KpiCard
            label={fa.dashboard.at_risk}
            value={toPersianDigits(kpis.at_risk_count)}
            icon={AlertTriangle}
            alert={kpis.at_risk_count > 0}
            href="/opportunities"
          />
          <KpiCard
            label={fa.dashboard.overdue}
            value={toPersianDigits(kpis.overdue_followups)}
            icon={Clock}
            alert={kpis.overdue_followups > 0}
            href="/activities"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold">{fa.dashboard.funnel_title}</h3>
        </CardHeader>
        <CardContent>
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: CHART_FONT }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis yAxisId="left" tick={{ fontFamily: CHART_FONT }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontFamily: CHART_FONT }} />
                <Tooltip
                  contentStyle={{ fontFamily: CHART_FONT, textAlign: 'right', direction: 'rtl' }}
                  formatter={(value, name) => {
                    const num = Number(value ?? 0)
                    if (name === fa.dashboard.funnel_value)
                      return [toPersianDigits(num.toFixed(1)), name]
                    return [toPersianDigits(num), String(name)]
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: CHART_FONT }} />
                <Bar
                  yAxisId="left"
                  dataKey="count"
                  name={fa.dashboard.funnel_count}
                  fill="#1e3a5f"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="conversion"
                    position="top"
                    formatter={(v) => {
                      const n = typeof v === 'number' ? v : null
                      return n != null && n > 0 ? `${formatPercentFa(n)} ↓` : ''
                    }}
                    style={{ fontFamily: CHART_FONT, fontSize: 10, fill: '#64748b' }}
                  />
                </Bar>
                <Bar
                  yAxisId="right"
                  dataKey="value"
                  name={fa.dashboard.funnel_value}
                  fill="#2d5a9e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">{fa.dashboard.monthly_trend}</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: CHART_FONT }} />
                  <YAxis tick={{ fontFamily: CHART_FONT }} />
                  <Tooltip
                    contentStyle={{ fontFamily: CHART_FONT, textAlign: 'right', direction: 'rtl' }}
                    formatter={(value) => {
                      const num = Number(value ?? 0)
                      return [toPersianDigits(num.toFixed(2)) + ' میلیارد ریال', 'ارزش']
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">{fa.dashboard.loss_reasons}</h3>
          </CardHeader>
          <CardContent>
            {lossPieData.length === 0 ? (
              <p className="py-12 text-center text-gray-400">{fa.winLoss.noLessons}</p>
            ) : (
              <div className="h-64" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={lossPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} (${toPersianDigits(Math.round((percent ?? 0) * 100))}٪)`
                      }
                    >
                      {lossPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontFamily: CHART_FONT, textAlign: 'right', direction: 'rtl' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">{fa.dashboard.team_performance}</h3>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="py-2 text-right font-medium">{fa.dashboard.expert}</th>
                  <th className="py-2 text-right font-medium">{fa.dashboard.active_opps}</th>
                  <th className="py-2 text-right font-medium">{fa.dashboard.pipeline_col}</th>
                  <th className="py-2 text-right font-medium">{fa.dashboard.win_rate_col}</th>
                  <th className="py-2 text-right font-medium">{fa.dashboard.last_activity_col}</th>
                </tr>
              </thead>
              <tbody>
                {team?.members.map((m) => (
                  <tr key={m.user_id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.user_name}</td>
                    <td className="py-2">{toPersianDigits(m.open_count)}</td>
                    <td className="py-2">{formatCurrencyFaShort(Number(m.pipeline_value))}</td>
                    <td className="py-2">{formatPercentFa(m.win_rate)}</td>
                    <td className="py-2 text-gray-500">
                      {m.last_activity_date ? toJalaliDateTime(m.last_activity_date) : '—'}
                    </td>
                  </tr>
                ))}
                {team?.members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      داده‌ای برای نمایش وجود ندارد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-base font-semibold">{fa.dashboard.recent_activities}</h3>
            <Link to="/activities" className="text-xs text-primary hover:underline">
              {fa.actions.viewAll}
            </Link>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-8 text-center text-gray-400">{fa.empty.activities}</p>
            ) : (
              <ActivityFeed
                activities={activities}
                onSelect={(id) => {
                  setSelectedActivityId(id)
                  navigate('/activities')
                }}
                expandedId={selectedActivityId}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExpertDashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<ExpertSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    try {
      const { data } = await dashboardApi.expertSummary()
      setSummary(data)
    } catch {
      toast.error(fa.toast.error)
    }
  }, [])

  useEffect(() => {
    fetchSummary().finally(() => setLoading(false))
  }, [fetchSummary])

  useEffect(() => {
    const interval = setInterval(fetchSummary, 60_000)
    return () => clearInterval(interval)
  }, [fetchSummary])

  if (loading) return <LoadingSkeleton rows={6} />
  if (!summary) {
    return (
      <div className="py-12 text-center text-gray-500">
        {fa.toast.error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary">{fa.dashboard.title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={fa.dashboard.pipeline_value}
          value={formatCurrencyFaShort(Number(summary.weighted_pipeline_value))}
          icon={TrendingUp}
          href="/opportunities"
        />
        <KpiCard
          label={fa.dashboard.open_opportunities}
          value={toPersianDigits(summary.open_opportunities_count)}
          icon={Users}
          href="/opportunities"
        />
        <KpiCard
          label={fa.dashboard.conversion_rate}
          value={formatPercentFa(summary.conversion_rate)}
          icon={Target}
        />
        <KpiCard
          label={fa.dashboard.overdue}
          value={toPersianDigits(summary.overdue_followups)}
          icon={Clock}
          alert={summary.overdue_followups > 0}
          href="/activities"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold">{fa.dashboard.open_opportunities}</h3>
          <Link to="/opportunities" className="text-xs text-primary hover:underline">
            {fa.actions.viewAll}
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2 text-right font-medium">عنوان</th>
                <th className="py-2 text-right font-medium">سازمان</th>
                <th className="py-2 text-right font-medium">مرحله</th>
                <th className="py-2 text-right font-medium">ارزش</th>
              </tr>
            </thead>
            <tbody>
              {summary.open_opportunities?.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                  onClick={() => navigate(`/opportunities/${o.id}`)}
                >
                  <td className="py-2 font-medium">{o.title}</td>
                  <td className="py-2 text-gray-600">{o.account_name ?? '—'}</td>
                  <td className="py-2">
                    <Badge variant={o.is_overdue ? 'red' : 'gray'}>
                      {enumLabel('sales_stage', o.sales_stage)}
                    </Badge>
                  </td>
                  <td className="py-2">{formatCurrencyFaShort(Number(o.estimated_value))}</td>
                </tr>
              ))}
              {(summary.open_opportunities?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    {fa.empty.opportunities}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="flex items-center gap-2 text-base font-semibold text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {fa.dashboard.overdue}
            </h3>
          </CardHeader>
          <CardContent>
            {(summary.overdue_activities?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-gray-400">پیگیری معوقی ندارید ✓</p>
            ) : (
              <ActivityFeed
                activities={summary.overdue_activities ?? []}
                onSelect={() => navigate('/activities')}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="h-4 w-4" />
              {fa.dashboard.upcoming_meetings}
            </h3>
          </CardHeader>
          <CardContent>
            {(summary.upcoming_activities?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-gray-400">جلسه‌ای برای این هفته ثبت نشده</p>
            ) : (
              <ActivityFeed
                activities={summary.upcoming_activities ?? []}
                onSelect={() => navigate('/activities')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { isManager } = usePermissions()

  return (
    <div>
      {!isManager && user && (
        <p className="mb-4 text-sm text-gray-500">
          {user.name} — {fa.enums.role.EXPERT}
        </p>
      )}
      {isManager ? <ManagerDashboard /> : <ExpertDashboard />}
    </div>
  )
}
