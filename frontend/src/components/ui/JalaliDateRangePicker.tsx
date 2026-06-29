import { JalaliDatePicker } from './JalaliDatePicker'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'
import { jalaliPresetRange, type JalaliPreset } from '@/lib/utils/jalali'

export interface JalaliDateRangePickerProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  className?: string
}

const PRESETS: { id: JalaliPreset; label: string }[] = [
  { id: 'week', label: fa.dashboard.periods.week },
  { id: 'month', label: fa.dashboard.periods.month },
  { id: 'quarter', label: fa.dashboard.periods.quarter },
  { id: 'year', label: fa.dashboard.periods.year },
]

export function JalaliDateRangePicker({
  from,
  to,
  onChange,
  className,
}: JalaliDateRangePickerProps) {
  const applyPreset = (preset: JalaliPreset) => {
    const range = jalaliPresetRange(preset)
    onChange(range.from, range.to)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 transition hover:border-primary hover:text-primary"
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-40">
          <JalaliDatePicker
            value={from}
            onChange={(jalaliStr) => onChange(jalaliStr || null, to)}
            placeholder={fa.datePicker.fromDate}
          />
        </div>
        <span className="text-sm text-gray-400">{fa.datePicker.rangeSeparator}</span>
        <div className="w-40">
          <JalaliDatePicker
            value={to}
            onChange={(jalaliStr) => onChange(from, jalaliStr || null)}
            placeholder={fa.datePicker.toDate}
          />
        </div>
      </div>
    </div>
  )
}
