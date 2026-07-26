import { z } from 'zod'
import { fa } from '@/lib/i18n/fa'
import { toWesternDigits } from '@/lib/utils/persian'

export const contactSchema = z.object({
  account_id: z.string().min(1, fa.validation.required),
  full_name: z.string().min(2, fa.validation.minLength(2)),
  job_title: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  direct_line: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  influence_level: z.string().optional().or(z.literal('')),
  sentiment: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const mobile = toWesternDigits(data.mobile ?? '').replace(/\D/g, '')
  if (mobile && !/^09\d{9}$/.test(mobile)) {
    ctx.addIssue({ code: 'custom', message: fa.validation.invalidMobile, path: ['mobile'] })
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    ctx.addIssue({ code: 'custom', message: fa.validation.invalidEmail, path: ['email'] })
  }
})

export type ContactFormValues = z.infer<typeof contactSchema>
