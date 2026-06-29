import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { accountsApi } from '@/api/accounts'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { fa } from '@/lib/i18n/fa'
import { accountSchema, type AccountFormValues } from '@/lib/validations/account'
import { usePermissions } from '@/hooks/usePermissions'
import type { Account, UserOption } from '@/types'

interface AccountFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
  onSuccess: () => void
}

const emptyDefaults: AccountFormValues = {
  name: '',
  national_id: '',
  industry: '',
  size: '',
  priority_level: '',
  location: '',
  website: '',
  relationship_status: '',
  account_manager_id: '',
}

export default function AccountFormModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountFormModalProps) {
  const { isManager } = usePermissions()
  const [users, setUsers] = useState<UserOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (open && account) {
      reset({
        name: account.name,
        national_id: account.national_id ?? '',
        industry: account.industry ?? '',
        size: account.size ?? '',
        priority_level: account.priority_level ?? '',
        location: account.location ?? '',
        website: account.website ?? '',
        relationship_status: account.relationship_status ?? '',
        account_manager_id: account.account_manager_id ?? '',
      })
    } else if (open) {
      reset(emptyDefaults)
    }
  }, [open, account, reset])

  useEffect(() => {
    if (open && isManager) {
      authApi.listUsers().then(({ data }) => setUsers(data)).catch(() => {})
    }
  }, [open, isManager])

  const onSubmit = async (values: AccountFormValues) => {
    setSubmitting(true)
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined)
    )
    try {
      if (account) {
        await accountsApi.update(account.id, payload)
        toast.success(fa.toast.updateSuccess('سازمان'))
      } else {
        await accountsApi.create(payload)
        toast.success(fa.toast.createSuccess('سازمان'))
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={account ? 'ویرایش سازمان' : 'افزودن سازمان'}
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
          <Label>{fa.accounts.name} *</Label>
          <Input {...register('name')} error={!!errors.name} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <Label>{fa.accounts.nationalId}</Label>
          <Input {...register('national_id')} dir="ltr" />
          {errors.national_id && (
            <p className="mt-1 text-xs text-red-500">{errors.national_id.message}</p>
          )}
        </div>
        <div>
          <Label>{fa.accounts.industry}</Label>
          <Select {...register('industry')}>
            <option value="">—</option>
            {Object.entries(fa.enums.industry).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{fa.accounts.size}</Label>
          <Select {...register('size')}>
            <option value="">—</option>
            {Object.entries(fa.enums.size).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{fa.accounts.priority}</Label>
          <Select {...register('priority_level')}>
            <option value="">—</option>
            {Object.entries(fa.enums.priority_level).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{fa.accounts.relationship}</Label>
          <Select {...register('relationship_status')}>
            <option value="">—</option>
            {Object.entries(fa.enums.relationship_status).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{fa.accounts.location}</Label>
          <Input {...register('location')} />
        </div>
        <div>
          <Label>{fa.accounts.website}</Label>
          <Input {...register('website')} dir="ltr" placeholder="https://example.com" />
          {errors.website && (
            <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>
          )}
        </div>
        {isManager && (
          <div className="sm:col-span-2">
            <Label>{fa.accounts.manager}</Label>
            <Select {...register('account_manager_id')}>
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
        )}
      </form>
    </Dialog>
  )
}
