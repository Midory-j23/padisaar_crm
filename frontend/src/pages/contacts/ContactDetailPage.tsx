import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Mail, Pencil, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { contactsApi } from '@/api/contacts'
import {
  Badge,
  influenceBadgeVariant,
  sentimentBadgeVariant,
} from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { ContactAvatar, sentimentLabel } from '@/components/shared/ContactAvatar'
import { LoadingSkeleton } from '@/components/shared/SharedComponents'
import EntityActivitiesTab from '@/components/shared/EntityActivitiesTab'
import ContactFormModal from './ContactFormModal'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import { formatPhoneFa } from '@/lib/utils/persian'
import type { Contact } from '@/types'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [editOpen, setEditOpen] = useState(false)

  const fetchContact = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await contactsApi.get(id)
      setContact(data)
    } catch {
      toast.error('مخاطب یافت نشد')
      navigate('/contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContact()
  }, [id])

  const tabs = [
    { id: 'info', label: fa.contacts.tabs.info },
    { id: 'activities', label: fa.contacts.tabs.activities },
  ]

  if (loading || !contact) return <LoadingSkeleton rows={6} />

  const fields = [
    { label: fa.contacts.fullName, value: contact.full_name },
    { label: fa.contacts.account, value: contact.account_name ?? '—' },
    { label: fa.contacts.jobTitle, value: contact.job_title ?? '—' },
    { label: fa.contacts.department, value: contact.department ?? '—' },
    {
      label: fa.contacts.influence,
      value: contact.influence_level ? (
        <Badge variant={influenceBadgeVariant(contact.influence_level)}>
          {enumLabel('influence_level', contact.influence_level)}
        </Badge>
      ) : '—',
    },
    {
      label: fa.contacts.sentiment,
      value: contact.sentiment ? (
        <Badge variant={sentimentBadgeVariant(contact.sentiment)}>
          {sentimentLabel(contact.sentiment)}
          {enumLabel('sentiment', contact.sentiment)}
        </Badge>
      ) : '—',
    },
    { label: 'تاریخ ثبت', value: toJalaliDateTime(contact.created_at) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <ContactAvatar name={contact.full_name} size="lg" />
        <div>
          <h2 className="text-xl font-bold">{contact.full_name}</h2>
          <p className="text-sm text-gray-500">
            {contact.job_title ?? '—'} — {contact.account_name}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-6 py-6">
          {contact.mobile ? (
            <a
              href={`tel:${contact.mobile}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Phone className="h-5 w-5" />
              <span dir="ltr">{formatPhoneFa(contact.mobile)}</span>
            </a>
          ) : (
            <span className="flex items-center gap-2 text-gray-400">
              <Phone className="h-5 w-5" />
              —
            </span>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="h-5 w-5" />
              <span dir="ltr">{contact.email}</span>
            </a>
          )}
          {contact.direct_line && (
            <span className="flex items-center gap-2 text-gray-600">
              <Phone className="h-5 w-5" />
              <span dir="ltr">{formatPhoneFa(contact.direct_line)}</span>
              <span className="text-xs text-gray-400">(خط مستقیم)</span>
            </span>
          )}
        </CardContent>
      </Card>

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
          {tab === 'activities' && contact && (
            <EntityActivitiesTab accountId={contact.account_id} contactId={contact.id} lockAccount />
          )}
        </CardContent>
      </Card>

      <ContactFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
        onSuccess={fetchContact}
      />
    </div>
  )
}
