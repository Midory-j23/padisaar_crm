import { useEffect, useId, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'
import {
  JALALI_DAYS,
  JALALI_MONTHS,
  addJalaliMonths,
  formatJalaliStorage,
  fromJalali,
  gregorianToJalaliString,
  isValidJalaliString,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
  parseJalaliParts,
  todayJalaliString,
} from '@/lib/utils/jalali'
import { toPersianDigits, toWesternDigits } from '@/lib/utils/persian'

export interface JalaliDatePickerProps {
  value: string | null
  onChange: (jalaliStr: string, gregorianDate: Date | null) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = fa.datePicker.placeholder,
  disabled = false,
  hasError = false,
  className,
}: JalaliDatePickerProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState('')

  const initial = parseJalaliParts(value ?? '') ?? parseJalaliParts(todayJalaliString())!
  const [viewYear, setViewYear] = useState(initial.jy)
  const [viewMonth, setViewMonth] = useState(initial.jm)

  useEffect(() => {
    setInputText(value ? toPersianDigits(value) : '')
    const parts = parseJalaliParts(value ?? '')
    if (parts) {
      setViewYear(parts.jy)
      setViewMonth(parts.jm)
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectDate = (jy: number, jm: number, jd: number) => {
    const storage = formatJalaliStorage(jy, jm, jd)
    onChange(storage, fromJalali(storage))
    setInputText(toPersianDigits(storage))
    setOpen(false)
  }

  const commitInput = () => {
    const western = toWesternDigits(inputText.trim())
    if (!western) {
      onChange('', null)
      return
    }
    if (isValidJalaliString(western)) {
      onChange(western, fromJalali(western))
      setInputText(toPersianDigits(western))
    } else {
      setInputText(value ? toPersianDigits(value) : '')
    }
  }

  const monthDays = jalaliMonthLength(viewYear, viewMonth)
  const startPad = jalaliMonthStartWeekday(viewYear, viewMonth)
  const selected = parseJalaliParts(value ?? '')

  const cells: Array<{ day: number; jy: number; jm: number } | null> = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= monthDays; d++) cells.push({ day: d, jy: viewYear, jm: viewMonth })

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          id={listId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={commitInput}
          onFocus={() => !disabled && setOpen(true)}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white py-2 pl-10 pr-3 text-sm text-right placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
            hasError ? 'border-red-500' : 'border-gray-300'
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary disabled:opacity-50"
          aria-label={fa.datePicker.openCalendar}
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100"
              aria-label={fa.datePicker.prevMonth}
              onClick={() => {
                const n = addJalaliMonths(viewYear, viewMonth, -1)
                setViewYear(n.jy)
                setViewMonth(n.jm)
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {JALALI_MONTHS[viewMonth - 1]} {toPersianDigits(viewYear)}
            </span>
            <button
              type="button"
              className="rounded p-1 hover:bg-gray-100"
              aria-label={fa.datePicker.nextMonth}
              onClick={() => {
                const n = addJalaliMonths(viewYear, viewMonth, 1)
                setViewYear(n.jy)
                setViewMonth(n.jm)
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
            {JALALI_DAYS.map((d) => (
              <span key={d} className="py-1 font-medium">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) =>
              cell ? (
                <button
                  key={`${cell.jy}-${cell.jm}-${cell.day}-${idx}`}
                  type="button"
                  onClick={() => selectDate(cell.jy, cell.jm, cell.day)}
                  className={cn(
                    'rounded-md py-1.5 text-sm hover:bg-primary/10',
                    selected?.jy === cell.jy &&
                      selected?.jm === cell.jm &&
                      selected?.jd === cell.day &&
                      'bg-primary text-white hover:bg-primary'
                  )}
                >
                  {toPersianDigits(cell.day)}
                </button>
              ) : (
                <span key={`pad-${idx}`} />
              )
            )}
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-md border border-gray-200 py-1.5 text-sm text-primary hover:bg-gray-50"
            onClick={() => {
              const today = todayJalaliString()
              const parts = parseJalaliParts(today)!
              setViewYear(parts.jy)
              setViewMonth(parts.jm)
              selectDate(parts.jy, parts.jm, parts.jd)
            }}
          >
            {fa.datePicker.today}
          </button>
        </div>
      )}
    </div>
  )
}

/** Controlled picker bound to an ISO/Gregorian API value */
export function JalaliDatePickerFromISO({
  isoValue,
  onISOChange,
  ...props
}: Omit<JalaliDatePickerProps, 'value' | 'onChange'> & {
  isoValue?: string | null
  onISOChange: (iso: string | null) => void
}) {
  const jalaliValue = gregorianToJalaliString(isoValue)
  return (
    <JalaliDatePicker
      {...props}
      value={jalaliValue || null}
      onChange={(jalaliStr, date) => {
        if (!jalaliStr || !date) {
          onISOChange(null)
          return
        }
        date.setHours(0, 0, 0, 0)
        onISOChange(date.toISOString())
      }}
    />
  )
}
