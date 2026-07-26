import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { accountsApi } from '@/api/accounts'
import { contactsApi } from '@/api/contacts'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { fa } from '@/lib/i18n/fa'
import { contactSchema, type ContactFormValues } from '@/lib/validations/contact'
import { toWesternDigits } from '@/lib/utils/persian'
import type { Account, Contact } from '@/types'

interface ContactFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  defaultAccountId?: string
  lockAccount?: boolean
  onSuccess: () => void
}

const emptyDefaults: ContactFormValues = {
  account_id: '',
  full_name: '',
  job_title: '',
  department: '',
  mobile: '',
  direct_line: '',
  email: '',
  influence_level: '',
  sentiment: '',
}

export default function ContactFormModal({
  open,
  onOpenChange,
  contact,
  defaultAccountId,
  lockAccount = false,
  onSuccess,
}: ContactFormModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [mobileError, setMobileError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (open) {
      accountsApi.list({ per_page: 100 }).then(({ data }) => setAccounts(data.items)).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (open && contact) {
      reset({
        account_id: contact.account_id,
        full_name: contact.full_name,
        job_title: contact.job_title ?? '',
        department: contact.department ?? '',
        mobile: contact.mobile ?? '',
        direct_line: contact.direct_line ?? '',
        email: contact.email ?? '',
        influence_level: contact.influence_level ?? '',
        sentiment: contact.sentiment ?? '',
      })
    } else if (open) {
      reset({ ...emptyDefaults, account_id: defaultAccountId ?? '' })
    }
    setMobileError('')
  }, [open, contact, defaultAccountId, reset])

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitting(true)
    setMobileError('')
    const mobileDigits = toWesternDigits(values.mobile ?? '').replace(/\D/g, '')
    const payload: Record<string, string | null> = Object.fromEntries(
      Object.entries({
        ...values,
        mobile: mobileDigits,
      }).filter(([, v]) => v !== '' && v !== undefined)
    )
    // Allow clearing mobile on edit
    if (contact) {
      payload.mobile = mobileDigits || null
    }
    try {
      if (contact) {
        await contactsApi.update(contact.id, payload)
        toast.success(fa.toast.updateSuccess('مخاطب'))
      } else {
        await contactsApi.create(payload)
        toast.success(fa.toast.createSuccess('مخاطب'))
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (detail === fa.validation.duplicateMobile || detail?.includes('موبایل')) {
        setMobileError(detail)
      } else {
        toast.error(detail ?? fa.toast.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={contact ? 'ویرایش مخاطب' : 'افزودن مخاطب'}
      className="max-w-2xl"
      footer={
        <>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? fa.actions.submitting : fa.actions.save}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {fa.actions.cancel}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>{fa.contacts.account} *</Label>
          <Select
            {...register('account_id')}
            disabled={lockAccount}
            error={!!errors.account_id}
          >
            <option value="">انتخاب سازمان...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          {errors.account_id && (
            <p className="mt-1 text-xs text-red-500">{errors.account_id.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>{fa.contacts.fullName} *</Label>
          <Input {...register('full_name')} error={!!errors.full_name} />
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>
        <div>
          <Label>{fa.contacts.jobTitle}</Label>
          <Input {...register('job_title')} />
        </div>
        <div>
          <Label>{fa.contacts.department}</Label>
          <Input {...register('department')} />
        </div>
        <div>
          <Label>{fa.contacts.mobile}</Label>
          <Input {...register('mobile')} dir="ltr" placeholder="09123456789" error={!!errors.mobile || !!mobileError} />
          {(errors.mobile || mobileError) && (
            <p className="mt-1 text-xs text-red-500">{mobileError || errors.mobile?.message}</p>
          )}
        </div>
        <div>
          <Label>{fa.contacts.directLine}</Label>
          <Input {...register('direct_line')} dir="ltr" />
        </div>
        <div>
          <Label>{fa.contacts.email}</Label>
          <Input {...register('email')} dir="ltr" type="email" />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label>{fa.contacts.influence}</Label>
          <Select {...register('influence_level')}>
            <option value="">—</option>
            {Object.entries(fa.enums.influence_level).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{fa.contacts.sentiment}</Label>
          <Select {...register('sentiment')}>
            <option value="">—</option>
            {Object.entries(fa.enums.sentiment).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </form>
    </Dialog>
  )
}
