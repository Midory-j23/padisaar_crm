import * as jalaali from 'jalaali-js'
import { toPersianDigits, toWesternDigits } from './persian'

/** Application display timezone — all API timestamps are stored as UTC. */
export const APP_TIMEZONE = 'Asia/Tehran'

const TEHRAN_UTC_OFFSET_MS = 3.5 * 60 * 60 * 1000

/** Parse API datetime strings; naive ISO values from the backend are treated as UTC. */
export function parseApiDateTime(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const raw = value.trim()
  if (!raw) return null
  const hasTimezone = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)
  const normalized = hasTimezone ? raw : `${raw.includes('T') ? raw : `${raw}T00:00:00`}Z`
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

function tehranWallTimeToUtc(
  gy: number,
  gm: number,
  gd: number,
  h = 0,
  m = 0,
  s = 0,
  ms = 0,
): Date {
  return new Date(Date.UTC(gy, gm - 1, gd, h, m, s, ms) - TEHRAN_UTC_OFFSET_MS)
}

function tehranDateParts(d: Date): { gy: number; gm: number; gd: number; h: string; m: string; s: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]))
  return {
    gy: Number(parts.year),
    gm: Number(parts.month),
    gd: Number(parts.day),
    h: parts.hour,
    m: parts.minute,
    s: parts.second,
  }
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const JALALI_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

/** Western digits YYYY/MM/DD for form state */
export function formatJalaliStorage(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}

export function parseJalaliParts(jalaliStr: string): { jy: number; jm: number; jd: number } | null {
  const normalized = toWesternDigits(jalaliStr.trim())
  const parts = normalized.split(/[/\-]/)
  if (parts.length !== 3) return null
  const [jy, jm, jd] = parts.map(Number)
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null
  return { jy, jm, jd }
}

export function todayJalaliString(): string {
  const now = new Date()
  const { jy, jm, jd } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate())
  return formatJalaliStorage(jy, jm, jd)
}

export function gregorianToJalaliString(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  const { jy, jm, jd } = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return formatJalaliStorage(jy, jm, jd)
}

export function jalaliStringToGregorianDate(jalaliStr: string): Date | null {
  return fromJalali(jalaliStr)
}

export function jalaliStringToISO(jalaliStr: string, endOfDay = false): string | null {
  const parts = parseJalaliParts(jalaliStr)
  if (!parts) return null
  const { gy, gm, gd } = jalaali.toGregorian(parts.jy, parts.jm, parts.jd)
  const d = tehranWallTimeToUtc(
    gy,
    gm,
    gd,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  )
  return d.toISOString()
}

export function isValidJalaliString(value: string): boolean {
  if (!value.trim()) return false
  return parseJalaliParts(value) !== null
}

export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm)
}

/** Weekday index 0=Saturday … 6=Friday for first day of Jalali month */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, 1)
  const jsDay = new Date(gy, gm - 1, gd).getDay()
  return (jsDay + 1) % 7
}

export function addJalaliMonths(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let monthIndex = jy * 12 + (jm - 1) + delta
  const ny = Math.floor(monthIndex / 12)
  const nm = (monthIndex % 12) + 1
  return { jy: ny, jm: nm }
}

export function toJalali(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseApiDateTime(date) : date
  if (!d || isNaN(d.getTime())) return '—'
  const { gy, gm, gd } = tehranDateParts(d)
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd)
  return toPersianDigits(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`)
}

export function toJalaliLong(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseApiDateTime(date) : date
  if (!d || isNaN(d.getTime())) return '—'
  const { gy, gm, gd } = tehranDateParts(d)
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd)
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`
}

export function toJalaliDateTime(
  date: Date | string | null | undefined,
  withSeconds = false,
): string {
  const d = typeof date === 'string' ? parseApiDateTime(date) : date
  if (!d || isNaN(d.getTime())) return '—'
  const { gy, gm, gd, h, m, s } = tehranDateParts(d)
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd)
  const dateStr = toPersianDigits(
    `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`,
  )
  const timeStr = withSeconds
    ? `${toPersianDigits(h)}:${toPersianDigits(m)}:${toPersianDigits(s)}`
    : `${toPersianDigits(h)}:${toPersianDigits(m)}`
  return `${dateStr} — ${timeStr}`
}

export function fromJalali(jalaliStr: string): Date | null {
  const normalized = toWesternDigits(jalaliStr)
  const parts = normalized.split('/')
  if (parts.length !== 3) return null
  const [jy, jm, jd] = parts.map(Number)
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd)
  return new Date(gy, gm - 1, gd)
}

export function currentJalaliYear(): number {
  const now = new Date()
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate()).jy
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

export type JalaliPreset = 'week' | 'month' | 'quarter' | 'year'

/** Preset date ranges using Jalali calendar boundaries */
export function jalaliPresetRange(preset: JalaliPreset): { from: string; to: string } {
  const to = todayJalaliString()
  const now = new Date()
  const { jy, jm } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate())

  if (preset === 'year') {
    return { from: formatJalaliStorage(jy, 1, 1), to }
  }
  if (preset === 'month') {
    return { from: formatJalaliStorage(jy, jm, 1), to }
  }
  if (preset === 'quarter') {
    const startMonth = Math.floor((jm - 1) / 3) * 3 + 1
    return { from: formatJalaliStorage(jy, startMonth, 1), to }
  }
  const day = now.getDay()
  const diff = (day + 1) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - diff)
  return { from: gregorianToJalaliString(start), to }
}
