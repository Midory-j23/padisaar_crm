import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { accountsApi } from '@/api/accounts'
import { authApi } from '@/api/auth'
import { opportunitiesApi } from '@/api/opportunities'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { fa } from '@/lib/i18n/fa'
import { opportunitySchema, type OpportunityFormValues } from '@/lib/validations/opportunity'
import { fromJalali, gregorianToJalaliString } from '@/lib/utils/jalali'
import { usePermissions } from '@/hooks/usePermissions'
import type { Account, Opportunity, UserOption } from '@/types'

const STAGE_PROBABILITY: Record<string, number> = {
  INITIAL_CONTACT: 10,
  NEEDS_ASSESSMENT: 25,
  PROPOSAL_SENT: 40,
  NEGOTIATION: 65,
  CONTRACT_SIGNED: 90,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
  ABANDONED: 0,
}

interface OpportunityFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity?: Opportunity | null
  defaultAccountId?: string
  lockAccount?: boolean
  onSuccess: () => void
}

const emptyDefaults: OpportunityFormValues = {
  account_id: '',
  title: '',
  project_type: '',
  sales_stage: 'INITIAL_CONTACT',
  estimated_value: '',
  probability: '10',
  lead_source: '',
  expected_close_date: '',
  assigned_to_id: '',
  competitors: [],
}

export default function OpportunityFormModal({
  open,
  onOpenChange,
  opportunity,
  defaultAccountId,
  lockAccount = false,
  onSuccess,
}: OpportunityFormModalProps) {
  const { isManager } = usePermissions()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [competitors, setCompetitors] = useState<string[]>([])
  const [competitorInput, setCompetitorInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: emptyDefaults,
  })

  const salesStage = watch('sales_stage')

  useEffect(() => {
    if (salesStage && STAGE_PROBABILITY[salesStage] !== undefined) {
      setValue('probability', String(STAGE_PROBABILITY[salesStage]))
    }
  }, [salesStage, setValue])

  useEffect(() => {
    if (open) {
      accountsApi.list({ per_page: 100 }).then(({ data }) => setAccounts(data.items)).catch(() => {})
      if (isManager) authApi.listUsers().then(({ data }) => setUsers(data)).catch(() => {})
    }
  }, [open, isManager])

  useEffect(() => {
    if (open && opportunity) {
      reset({
        account_id: opportunity.account_id,
        title: opportunity.title,
        project_type: opportunity.project_type ?? '',
        sales_stage: opportunity.sales_stage,
        estimated_value: opportunity.estimated_value?.toString() ?? '',
        probability: String(opportunity.probability),
        lead_source: opportunity.lead_source ?? '',
        expected_close_date: opportunity.expected_close_date
          ? gregorianToJalaliString(opportunity.expected_close_date)
          : '',
        assigned_to_id: opportunity.assigned_to_id ?? '',
      })
      setCompetitors(opportunity.competitors ?? [])
    } else if (open) {
      reset({ ...emptyDefaults, account_id: defaultAccountId ?? '' })
      setCompetitors([])
    }
    setCompetitorInput('')
  }, [open, opportunity, defaultAccountId, reset])

  const addCompetitor = () => {
    const v = competitorInput.trim()
    if (v && !competitors.includes(v)) {
      setCompetitors([...competitors, v])
      setCompetitorInput('')
    }
  }

  const onSubmit = async (values: OpportunityFormValues) => {
    setSubmitting(true)
    const payload: Record<string, unknown> = {
      account_id: values.account_id,
      title: values.title,
      sales_stage: values.sales_stage,
      probability: Number(values.probability),
      competitors,
    }
    if (values.project_type) payload.project_type = values.project_type
    if (values.lead_source) payload.lead_source = values.lead_source
    if (values.assigned_to_id) payload.assigned_to_id = values.assigned_to_id
    if (values.estimated_value) payload.estimated_value = Number(values.estimated_value.replace(/,/g, ''))
    if (values.expected_close_date) {
      const closeDate = fromJalali(values.expected_close_date)
      if (closeDate) payload.expected_close_date = closeDate.toISOString()
    }

    try {
      if (opportunity) {
        await opportunitiesApi.update(opportunity.id, payload)
        toast.success(fa.toast.updateSuccess('فرصت'))
      } else {
        await opportunitiesApi.create(payload)
        toast.success(fa.toast.createSuccess('فرصت'))
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
      title={opportunity ? 'ویرایش فرصت' : 'افزودن فرصت'}
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
          <Label>{fa.opportunities.account} *</Label>
          <Select {...register('account_id')} disabled={lockAccount}>
            <option value="">انتخاب سازمان...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          {errors.account_id && <p className="mt-1 text-xs text-red-500">{errors.account_id.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label>{fa.opportunities.oppTitle} *</Label>
          <Input {...register('title')} />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>
        <div>
          <Label>{fa.opportunities.projectType}</Label>
          <Select {...register('project_type')}>
            <option value="">—</option>
            {Object.entries(fa.enums.project_type).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <Label>{fa.opportunities.stage}</Label>
          <Select {...register('sales_stage')}>
            {Object.entries(fa.enums.sales_stage).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <Label>{fa.opportunities.value}</Label>
          <Input {...register('estimated_value')} dir="ltr" placeholder="1000000000" />
        </div>
        <div>
          <Label>{fa.opportunities.probability}</Label>
          <Input {...register('probability')} dir="ltr" readOnly className="bg-gray-50" />
          <p className="mt-1 text-xs text-gray-400">بر اساس مرحله فروش تنظیم می‌شود</p>
        </div>
        <div>
          <Label>{fa.opportunities.leadSource}</Label>
          <Select {...register('lead_source')}>
            <option value="">—</option>
            {Object.entries(fa.enums.lead_source).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <Label>{fa.opportunities.closeDate}</Label>
          <JalaliDatePicker
            value={watch('expected_close_date') || null}
            onChange={(jalaliStr) => setValue('expected_close_date', jalaliStr, { shouldValidate: true })}
            hasError={!!errors.expected_close_date}
          />
        </div>
        {isManager && (
          <div className="sm:col-span-2">
            <Label>{fa.opportunities.assignedTo}</Label>
            <Select {...register('assigned_to_id')}>
              <option value="">—</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
        )}
        <div className="sm:col-span-2">
          <Label>{fa.opportunities.competitors}</Label>
          <div className="flex gap-2">
            <Input
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor() } }}
              placeholder="نام رقیب + Enter"
            />
            <Button type="button" variant="outline" onClick={addCompetitor}>{fa.actions.add}</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {competitors.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs">
                {c}
                <button type="button" onClick={() => setCompetitors(competitors.filter((x) => x !== c))}>×</button>
              </span>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
