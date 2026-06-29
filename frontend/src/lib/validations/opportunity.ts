import { z } from 'zod'
import { fa } from '@/lib/i18n/fa'
import { isValidJalaliString } from '@/lib/utils/jalali'

const optionalJalaliDate = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || isValidJalaliString(v), fa.datePicker.invalidDate)

export const opportunitySchema = z.object({
  account_id: z.string().min(1, fa.validation.required),
  title: z.string().min(2, fa.validation.minLength(2)),
  project_type: z.string().optional().or(z.literal('')),
  sales_stage: z.string().min(1),
  estimated_value: z.string().optional().or(z.literal('')),
  probability: z.string().optional().or(z.literal('')),
  lead_source: z.string().optional().or(z.literal('')),
  expected_close_date: optionalJalaliDate,
  assigned_to_id: z.string().optional().or(z.literal('')),
  competitors: z.array(z.string()).optional(),
})

export type OpportunityFormValues = z.infer<typeof opportunitySchema>
