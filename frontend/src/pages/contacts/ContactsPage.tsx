import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { contactsApi } from '@/api/contacts'
import {
  Badge,
  influenceBadgeVariant,
  sentimentBadgeVariant,
} from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog, EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import { sentimentLabel } from '@/components/shared/ContactAvatar'
import ContactFormModal from './ContactFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatPhoneFa, toPersianDigits } from '@/lib/utils/persian'
import { usePermissions } from '@/hooks/usePermissions'
import type { Contact } from '@/types'

export default function ContactsPage() {
  const navigate = useNavigate()
  const { canDelete } = usePermissions()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [influence, setInfluence] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await contactsApi.list({
        page,
        per_page: 20,
        search: debouncedSearch || undefined,
        influence_level: influence || undefined,
        sentiment: sentiment || undefined,
      })
      setContacts(data.items)
      setTotal(data.total)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, influence, sentiment])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await contactsApi.delete(deleteId)
      toast.success(fa.toast.deleteSuccess('مخاطب'))
      setDeleteId(null)
      fetchContacts()
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
          <Select
            value={influence}
            onChange={(e) => { setInfluence(e.target.value); setPage(1) }}
            className="w-44"
          >
            <option value="">{fa.contacts.influence}</option>
            {Object.entries(fa.enums.influence_level).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select
            value={sentiment}
            onChange={(e) => { setSentiment(e.target.value); setPage(1) }}
            className="w-40"
          >
            <option value="">{fa.contacts.sentiment}</option>
            {Object.entries(fa.enums.sentiment).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Button onClick={() => { setEditContact(null); setModalOpen(true) }}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addContact}
        </Button>
      </div>

      <Card>
        {loading ? (
          <LoadingSkeleton rows={8} />
        ) : contacts.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? fa.empty.search_results : fa.empty.contacts}
            hint={!debouncedSearch ? fa.empty.contacts_hint : undefined}
            action={
              !debouncedSearch && (
                <Button onClick={() => setModalOpen(true)}>{fa.actions.addContact}</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3">{fa.contacts.operations}</th>
                  <th className="px-4 py-3">{fa.contacts.fullName}</th>
                  <th className="px-4 py-3">{fa.contacts.account}</th>
                  <th className="px-4 py-3">{fa.contacts.jobTitle}</th>
                  <th className="px-4 py-3">{fa.contacts.mobile}</th>
                  <th className="px-4 py-3">{fa.contacts.influence}</th>
                  <th className="px-4 py-3">{fa.contacts.sentiment}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => navigate(`/contacts/${c.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditContact(c); setModalOpen(true) }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.full_name}</td>
                    <td className="px-4 py-3">{c.account_name ?? '—'}</td>
                    <td className="px-4 py-3">{c.job_title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${c.mobile}`}
                        className="text-primary hover:underline"
                        dir="ltr"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatPhoneFa(c.mobile)}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {c.influence_level ? (
                        <Badge variant={influenceBadgeVariant(c.influence_level)}>
                          {enumLabel('influence_level', c.influence_level)}
                        </Badge>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.sentiment ? (
                        <Badge variant={sentimentBadgeVariant(c.sentiment)}>
                          {sentimentLabel(c.sentiment)}
                          {enumLabel('sentiment', c.sentiment)}
                        </Badge>
                      ) : '—'}
                    </td>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <ContactFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contact={editContact}
        onSuccess={fetchContacts}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="حذف مخاطب"
        message={fa.confirm.deleteContact}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
