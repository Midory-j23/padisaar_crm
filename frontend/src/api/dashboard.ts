import api from './axios'
import type {
  Activity,
  DashboardKpis,
  ExpertSummary,
  FunnelResponse,
  TeamPerformanceResponse,
  TrendsResponse,
} from '../types'

export const dashboardApi = {
  kpis: (params?: { period?: string }) => api.get<DashboardKpis>('/dashboard/kpis', { params }),
  funnel: () => api.get<FunnelResponse>('/dashboard/funnel'),
  teamPerformance: () => api.get<TeamPerformanceResponse>('/dashboard/team-performance'),
  trends: () => api.get<TrendsResponse>('/dashboard/trends'),
  recentActivities: (limit = 10) =>
    api.get<{ items: Activity[] }>('/dashboard/recent-activities', { params: { limit } }),
  expertSummary: () => api.get<ExpertSummary>('/dashboard/expert-summary'),
}
