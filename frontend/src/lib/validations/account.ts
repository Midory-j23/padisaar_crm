import { z } from 'zod'
import { fa } from '@/lib/i18n/fa'
import { toWesternDigits } from '@/lib/utils/persian'

export const accountSchema = z.object({
  name: z.string().min(2, fa.validation.minLength(2)),
  national_id: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  priority_level: z.string().optional().or(z.literal('')),
  province: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  relationship_status: z.string().optional().or(z.literal('')),
  account_manager_id: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const nid = data.national_id ? toWesternDigits(data.national_id) : ''
  if (nid && !/^\d{11}$/.test(nid)) {
    ctx.addIssue({ code: 'custom', message: fa.validation.invalidNationalId, path: ['national_id'] })
  }
})

export type AccountFormValues = z.infer<typeof accountSchema>
