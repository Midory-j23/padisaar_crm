import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { activitiesApi } from '@/api/activities'
import { contactsApi } from '@/api/contacts'
import { opportunitiesApi } from '@/api/opportunities'
import { SearchableAccountSelect } from '@/components/shared/SearchableAccountSelect'
import { UpdateOpportunityPrompt } from '@/components/shared/UpdateOpportunityPrompt'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { fa } from '@/lib/i18n/fa'
import { activitySchema, type ActivityFormValues } from '@/lib/validations/activity'
import {
  fromJalali,
  gregorianToJalaliString,
  todayJalaliString,
} from '@/lib/utils/jalali'
import type { Activity, Contact, Opportunity } from '@/types'

interface ActivityFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity?: Activity | null
  defaultAccountId?: string
  defaultOpportunityId?: string
  defaultContactId?: string
  lockAccount?: boolean
  onSuccess: () => void
}

const emptyDefaults: ActivityFormValues = {
  account_id: '',
  opportunity_id: '',
  contact_ids: [],
  activity_type: 'IN_PERSON_MEETING',
  activity_date: todayJalaliString(),
  activity_time: '10:00',
  meeting_notes: '',
  outcome: '',
  next_step: '',
  follow_up_date: '',
  attachment_url: '',
}

function combineJalaliDateTime(jalaliDate: string, time: string): string {
  const base = fromJalali(jalaliDate)
  if (!base) return new Date().toISOString()
  const [h, m] = time.split(':').map(Number)
  base.setHours(h || 0, m || 0, 0, 0)
  return base.toISOString()
}

export default function ActivityFormModal({
  open,
  onOpenChange,
  activity,
  defaultAccountId,
  defaultOpportunityId,
  defaultContactId,
  lockAccount = false,
  onSuccess,
}: ActivityFormModalProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachmentName, setAttachmentName] = useState('')
  const [oppPromptOpen, setOppPromptOpen] = useState(false)
  const [createdOpportunityId, setCreatedOpportunityId] = useState<string | null>(null)
  const [createdOpportunityTitle, setCreatedOpportunityTitle] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: emptyDefaults,
  })

  const accountId = watch('account_id')
  const contactIds = watch('contact_ids') ?? []

  useEffect(() => {
    if (accountId) {
      opportunitiesApi.list({ account_id: accountId, per_page: 100 }).then(({ data }) => setOpportunities(data.items)).catch(() => {})
      contactsApi.list({ account_id: accountId, per_page: 100 }).then(({ data }) => setContacts(data.items)).catch(() => {})
    } else {
      setOpportunities([])
      setContacts([])
    }
  }, [accountId])

  useEffect(() => {
    if (open && activity) {
      const d = new Date(activity.activity_date)
      reset({
        account_id: activity.account_id,
        opportunity_id: activity.opportunity_id ?? '',
        contact_ids: activity.contact_ids?.length
          ? activity.contact_ids
          : activity.contact_id
            ? [activity.contact_id]
            : [],
        activity_type: activity.activity_type,
        activity_date: gregorianToJalaliString(activity.activity_date),
        activity_time: d.toTimeString().slice(0, 5),
        meeting_notes: activity.meeting_notes ?? '',
        outcome: activity.outcome ?? '',
        next_step: activity.next_step ?? '',
        follow_up_date: activity.follow_up_date
          ? gregorianToJalaliString(activity.follow_up_date)
          : '',
        attachment_url: activity.attachment_url ?? '',
      })
      setAttachmentName(activity.attachment_url ? 'فایل پیوست' : '')
    } else if (open) {
      reset({
        ...emptyDefaults,
        account_id: defaultAccountId ?? '',
        opportunity_id: defaultOpportunityId ?? '',
        contact_ids: defaultContactId ? [defaultContactId] : [],
      })
      setAttachmentName('')
    }
  }, [open, activity, defaultAccountId, defaultOpportunityId, defaultContactId, reset])

  const toggleContact = (id: string) => {
    const next = contactIds.includes(id) ? contactIds.filter((c) => c !== id) : [...contactIds, id]
    setValue('contact_ids', next, { shouldValidate: true })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await activitiesApi.upload(file)
      setValue('attachment_url', data.url)
      setAttachmentName(data.filename)
      toast.success(fa.toast.createSuccess('فایل'))
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: ActivityFormValues) => {
    setSubmitting(true)
    const payload: Record<string, unknown> = {
      account_id: values.account_id,
      activity_type: values.activity_type,
      activity_date: combineJalaliDateTime(values.activity_date, values.activity_time),
      contact_ids: values.contact_ids,
    }
    if (values.opportunity_id) payload.opportunity_id = values.opportunity_id
    if (values.meeting_notes) payload.meeting_notes = values.meeting_notes
    if (values.outcome) payload.outcome = values.outcome
    if (values.next_step) payload.next_step = values.next_step
    if (values.follow_up_date) {
      const followUp = fromJalali(values.follow_up_date)
      if (followUp) payload.follow_up_date = followUp.toISOString()
    }
    if (values.attachment_url) payload.attachment_url = values.attachment_url

    try {
      if (activity) {
        await activitiesApi.update(activity.id, payload)
        toast.success(fa.toast.updateSuccess('فعالیت'))
        onOpenChange(false)
        onSuccess()
      } else {
        await activitiesApi.create(payload)
        toast.success(fa.toast.createSuccess('فعالیت'))
        onOpenChange(false)
        onSuccess()
        if (values.opportunity_id) {
          const opp = opportunities.find((o) => o.id === values.opportunity_id)
          setCreatedOpportunityId(values.opportunity_id)
          setCreatedOpportunityTitle(opp?.title ?? null)
          setOppPromptOpen(true)
        }
      }
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={activity ? fa.activities.formEditTitle : fa.activities.formCreateTitle}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        footer={
          <>
            <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
              {submitting ? fa.actions.submitting : fa.actions.save}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{fa.actions.cancel}</Button>
          </>
        }
      >
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{fa.activities.type} *</Label>
            <Select {...register('activity_type')}>
              {Object.entries(fa.enums.activity_type).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>{fa.activities.account} *</Label>
            <SearchableAccountSelect
              value={accountId}
              onChange={(id) => {
                setValue('account_id', id, { shouldValidate: true })
                setValue('opportunity_id', '')
                setValue('contact_ids', [])
              }}
              disabled={lockAccount}
              hasError={!!errors.account_id}
            />
            {errors.account_id && <p className="mt-1 text-xs text-red-500">{errors.account_id.message}</p>}
          </div>
          <div>
            <Label>{fa.activities.opportunity}</Label>
            <Select {...register('opportunity_id')}>
              <option value="">—</option>
              {opportunities.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </Select>
          </div>
          <div>
            <Label>{fa.activities.contacts}</Label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {contacts.length === 0 ? (
                <p className="text-xs text-gray-400">—</p>
              ) : (
                contacts.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={contactIds.includes(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-gray-300"
                    />
                    <span>{c.full_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <Label>{fa.activities.date} *</Label>
            <JalaliDatePicker
              value={watch('activity_date') || null}
              onChange={(jalaliStr) => setValue('activity_date', jalaliStr, { shouldValidate: true })}
              hasError={!!errors.activity_date}
            />
            {errors.activity_date && (
              <p className="mt-1 text-xs text-red-500">{errors.activity_date.message}</p>
            )}
          </div>
          <div>
            <Label>{fa.activities.time} *</Label>
            <Input type="time" {...register('activity_time')} dir="ltr" />
          </div>
          <div className="sm:col-span-2">
            <Label>{fa.activities.notes}</Label>
            <textarea
              {...register('meeting_notes')}
              className="min-h-[120px] w-full rounded-md border border-gray-300 p-3 text-sm"
              placeholder={fa.activities.notesPlaceholder}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{fa.activities.outcome}</Label>
            <textarea {...register('outcome')} className="min-h-[80px] w-full rounded-md border border-gray-300 p-3 text-sm" />
          </div>
          <div>
            <Label>{fa.activities.nextStep}</Label>
            <Input {...register('next_step')} />
          </div>
          <div>
            <Label>{fa.activities.followUpDate}</Label>
            <JalaliDatePicker
              value={watch('follow_up_date') || null}
              onChange={(jalaliStr) => setValue('follow_up_date', jalaliStr, { shouldValidate: true })}
              hasError={!!errors.follow_up_date}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{fa.activities.attachment}</Label>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-gray-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {fa.actions.upload}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
              </label>
              {attachmentName && <span className="text-sm text-gray-600">{attachmentName}</span>}
            </div>
          </div>
        </form>
      </Dialog>

      {createdOpportunityId && (
        <UpdateOpportunityPrompt
          open={oppPromptOpen}
          onOpenChange={setOppPromptOpen}
          opportunityId={createdOpportunityId}
          opportunityTitle={createdOpportunityTitle}
        />
      )}
    </>
  )
}
