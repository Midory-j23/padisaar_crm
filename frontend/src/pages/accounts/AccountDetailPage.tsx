import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { accountsApi } from '@/api/accounts'
import {
  Badge,
  priorityBadgeVariant,
  relationshipBadgeVariant,
} from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { LoadingSkeleton } from '@/components/shared/SharedComponents'
import AccountFormModal from './AccountFormModal'
import AccountContactsTab from './AccountContactsTab'
import AccountOpportunitiesTab from './AccountOpportunitiesTab'
import EntityActivitiesTab from '@/components/shared/EntityActivitiesTab'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import { usePermissions } from '@/hooks/usePermissions'
import type { Account, AuditLogEntry } from '@/types'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isManager } = usePermissions()
  const [account, setAccount] = useState<Account | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [editOpen, setEditOpen] = useState(false)

  const fetchAccount = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await accountsApi.get(id)
      setAccount(data)
      if (isManager) {
        const logs = await accountsApi.auditLogs(id)
        setAuditLogs(logs.data)
      }
    } catch {
      toast.error('سازمان یافت نشد')
      navigate('/accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [id, isManager])

  const tabs = [
    { id: 'info', label: fa.accounts.tabs.info },
    { id: 'contacts', label: fa.accounts.tabs.contacts },
    { id: 'opportunities', label: fa.accounts.tabs.opportunities },
    { id: 'activities', label: fa.accounts.tabs.activities },
    ...(isManager ? [{ id: 'audit', label: fa.accounts.tabs.audit }] : []),
  ]

  if (loading || !account) return <LoadingSkeleton rows={6} />

  const fields = [
    { label: fa.accounts.name, value: account.name },
    { label: fa.accounts.nationalId, value: account.national_id ?? '—' },
    { label: fa.accounts.industry, value: enumLabel('industry', account.industry) },
    { label: fa.accounts.size, value: enumLabel('size', account.size) },
    {
      label: fa.accounts.priority,
      value: account.priority_level ? (
        <Badge variant={priorityBadgeVariant(account.priority_level)}>
          {enumLabel('priority_level', account.priority_level)}
        </Badge>
      ) : '—',
    },
    {
      label: fa.accounts.relationship,
      value: account.relationship_status ? (
        <Badge variant={relationshipBadgeVariant(account.relationship_status)}>
          {enumLabel('relationship_status', account.relationship_status)}
        </Badge>
      ) : '—',
    },
    { label: fa.accounts.location, value: account.location ?? '—' },
    { label: fa.accounts.website, value: account.website ?? '—' },
    { label: fa.accounts.manager, value: account.account_manager_name ?? '—' },
    { label: fa.accounts.createdAt, value: toJalaliDateTime(account.created_at) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{account.name}</h2>
          <p className="text-sm text-gray-500">{fa.accounts.detail}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </CardHeader>
        <CardContent>
          {tab === 'info' && (
            <div>
              <div className="mb-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="ml-1 h-4 w-4" />
                  {fa.actions.edit}
                </Button>
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-gray-100 p-4">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {tab === 'contacts' && account && (
            <AccountContactsTab accountId={account.id} />
          )}
          {tab === 'opportunities' && account && (
            <AccountOpportunitiesTab accountId={account.id} />
          )}
          {tab === 'activities' && account && (
            <EntityActivitiesTab accountId={account.id} lockAccount />
          )}
          {tab === 'audit' && isManager && (
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-gray-500">تاریخچه‌ای ثبت نشده است.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Badge>{enumLabel('audit_action', log.action)}</Badge>
                      <span className="text-xs text-gray-500">
                        {toJalaliDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">
                      {log.changed_by_name ?? '—'} — {log.entity_type}
                    </p>
                    {log.action === 'UPDATE' && log.change_data?.after != null && (
                      <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                        {JSON.stringify(log.change_data.after, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AccountFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
        onSuccess={fetchAccount}
      />
    </div>
  )
}
