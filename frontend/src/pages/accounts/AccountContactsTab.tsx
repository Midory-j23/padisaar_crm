import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { contactsApi } from '@/api/contacts'
import {
  Badge,
  influenceBadgeVariant,
  sentimentBadgeVariant,
} from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { sentimentLabel } from '@/components/shared/ContactAvatar'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import ContactFormModal from '@/pages/contacts/ContactFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { formatPhoneFa } from '@/lib/utils/persian'
import type { Contact } from '@/types'

interface AccountContactsTabProps {
  accountId: string
}

export default function AccountContactsTab({ accountId }: AccountContactsTabProps) {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await contactsApi.list({ account_id: accountId, per_page: 100 })
      setContacts(data.items)
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addContact}
        </Button>
      </div>
      {contacts.length === 0 ? (
        <EmptyState
          title={fa.empty.contacts_for_account}
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>
              {fa.actions.addContact}
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3">{fa.contacts.fullName}</th>
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
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
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
      <ContactFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultAccountId={accountId}
        lockAccount
        onSuccess={fetchContacts}
      />
    </div>
  )
}
