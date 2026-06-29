import { z } from 'zod'
import { fa } from '@/lib/i18n/fa'
import { isValidJalaliString } from '@/lib/utils/jalali'

const jalaliDate = z
  .string()
  .min(1, fa.validation.required)
  .refine(isValidJalaliString, fa.datePicker.invalidDate)

const optionalJalaliDate = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((v) => !v || isValidJalaliString(v), fa.datePicker.invalidDate)

export const activitySchema = z.object({
  account_id: z.string().min(1, fa.validation.required),
  opportunity_id: z.string().optional().or(z.literal('')),
  contact_id: z.string().optional().or(z.literal('')),
  activity_type: z.string().min(1, fa.validation.required),
  activity_date: jalaliDate,
  activity_time: z.string().min(1, fa.validation.required),
  meeting_notes: z.string().optional().or(z.literal('')),
  outcome: z.string().optional().or(z.literal('')),
  next_step: z.string().optional().or(z.literal('')),
  follow_up_date: optionalJalaliDate,
  attachment_url: z.string().optional().or(z.literal('')),
})

export type ActivityFormValues = z.infer<typeof activitySchema>
