import api from './axios'
import type {
  Activity,
  AuditLogListResponse,
  ImportPreviewResponse,
  NotificationPrefs,
  Opportunity,
} from '../types'

export async function downloadExcel(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' })
  const url = window.URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export async function downloadPdf(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' })
  const url = window.URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

function queryString(params?: Record<string, string | undefined>) {
  const qs = new URLSearchParams()
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value)
    }
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const reportsApi = {
  opportunities: (params?: Record<string, string | undefined>) =>
    api.get<{ items: Opportunity[]; total: number }>('/reports/opportunities', { params }),

  activities: (params?: Record<string, string | undefined>) =>
    api.get<{ items: Activity[]; total: number }>('/reports/activities', { params }),

  exportAccounts: (template = false) =>
    downloadExcel(
      `/reports/export/accounts${template ? '?template=true' : ''}`,
      template ? 'accounts_template.xlsx' : 'accounts.xlsx'
    ),

  exportContacts: (template = false) =>
    downloadExcel(
      `/reports/export/contacts${template ? '?template=true' : ''}`,
      template ? 'contacts_template.xlsx' : 'contacts.xlsx'
    ),

  exportOpportunities: () => downloadExcel('/reports/export/opportunities', 'opportunities.xlsx'),

  exportActivities: () => downloadExcel('/reports/export/activities', 'activities.xlsx'),

  exportOpportunitiesPdf: (params?: Record<string, string | undefined>) =>
    downloadPdf(`/reports/export/pdf/opportunities${queryString(params)}`, 'opportunities_report.pdf'),

  exportActivitiesPdf: (params?: Record<string, string | undefined>) =>
    downloadPdf(`/reports/export/pdf/activities${queryString(params)}`, 'activities_report.pdf'),

  previewImportAccounts: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ImportPreviewResponse>('/reports/import/accounts/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  confirmImportAccounts: (records: Record<string, unknown>[]) =>
    api.post<{ created_count: number; message: string }>('/reports/import/accounts/confirm', {
      records,
    }),

  previewImportContacts: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ImportPreviewResponse>('/reports/import/contacts/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  confirmImportContacts: (records: Record<string, unknown>[]) =>
    api.post<{ created_count: number; message: string }>('/reports/import/contacts/confirm', {
      records,
    }),

  auditLog: (params?: Record<string, string | number | undefined>) =>
    api.get<AuditLogListResponse>('/reports/audit-log', { params }),
}

export type { NotificationPrefs }
