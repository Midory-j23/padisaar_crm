import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { accountsApi } from '@/api/accounts'
import {
  Badge,
  priorityBadgeVariant,
  relationshipBadgeVariant,
} from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog, EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import AccountFormModal from './AccountFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalali } from '@/lib/utils/jalali'
import { toPersianDigits } from '@/lib/utils/persian'
import { usePermissions } from '@/hooks/usePermissions'
import type { Account } from '@/types'

export default function AccountsPage() {
  const navigate = useNavigate()
  const { canDelete } = usePermissions()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [priority, setPriority] = useState('')
  const [relationship, setRelationship] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await accountsApi.list({
        page,
        per_page: 20,
        search: debouncedSearch || undefined,
        industry: industry || undefined,
        priority_level: priority || undefined,
        relationship_status: relationship || undefined,
      })
      setAccounts(data.items)
      setTotal(data.total)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, industry, priority, relationship])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await accountsApi.delete(deleteId)
      toast.success(fa.toast.deleteSuccess('سازمان'))
      setDeleteId(null)
      fetchAccounts()
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setDeleting(false)
    }
  }

  const perPage = 20
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={`${fa.actions.search}...`}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-56"
          />
          <Select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1) }} className="w-40">
            <option value="">{fa.accounts.industry}</option>
            {Object.entries(fa.enums.industry).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }} className="w-40">
            <option value="">{fa.accounts.priority}</option>
            {Object.entries(fa.enums.priority_level).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={relationship} onChange={(e) => { setRelationship(e.target.value); setPage(1) }} className="w-40">
            <option value="">{fa.accounts.relationship}</option>
            {Object.entries(fa.enums.relationship_status).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Button onClick={() => { setEditAccount(null); setModalOpen(true) }}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addAccount}
        </Button>
      </div>

      <Card>
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : accounts.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? fa.empty.search_results : fa.empty.accounts}
            hint={!debouncedSearch ? fa.empty.accounts_hint : undefined}
            action={
              !debouncedSearch && (
                <Button onClick={() => setModalOpen(true)}>{fa.actions.addAccount}</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3">{fa.accounts.operations}</th>
                  <th className="px-4 py-3">{fa.accounts.name}</th>
                  <th className="px-4 py-3">{fa.accounts.industry}</th>
                  <th className="px-4 py-3">{fa.accounts.size}</th>
                  <th className="px-4 py-3">{fa.accounts.priority}</th>
                  <th className="px-4 py-3">{fa.accounts.relationship}</th>
                  <th className="px-4 py-3">{fa.accounts.manager}</th>
                  <th className="px-4 py-3">{fa.accounts.createdAt}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => navigate(`/accounts/${acc.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditAccount(acc); setModalOpen(true) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(acc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{acc.name}</td>
                    <td className="px-4 py-3">{enumLabel('industry', acc.industry)}</td>
                    <td className="px-4 py-3">{enumLabel('size', acc.size)}</td>
                    <td className="px-4 py-3">
                      {acc.priority_level ? (
                        <Badge variant={priorityBadgeVariant(acc.priority_level)}>
                          {enumLabel('priority_level', acc.priority_level)}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {acc.relationship_status ? (
                        <Badge variant={relationshipBadgeVariant(acc.relationship_status)}>
                          {enumLabel('relationship_status', acc.relationship_status)}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{acc.account_manager_name ?? '—'}</td>
                    <td className="px-4 py-3">{toJalali(acc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 0 && (
          <CardContent className="flex items-center justify-between border-t py-3">
            <span className="text-sm text-gray-500">
              {fa.pagination.showing(from, to, total)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {fa.pagination.prev} →
              </Button>
              <span className="flex items-center text-sm">{toPersianDigits(page)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * perPage >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                ← {fa.pagination.next}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <AccountFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        account={editAccount}
        onSuccess={fetchAccounts}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="حذف سازمان"
        message={fa.confirm.deleteAccount}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
