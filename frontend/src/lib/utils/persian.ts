const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
const WESTERN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export function toPersianDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}

export function toWesternDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(WESTERN_DIGITS[PERSIAN_DIGITS.indexOf(d)]))
}

export function formatCurrencyFa(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return toPersianDigits(amount.toLocaleString('en-US')) + ' ریال'
}

export function formatCurrencyFaShort(amount: number | null | undefined): string {
  if (amount == null) return '—'
  if (amount >= 1_000_000_000)
    return toPersianDigits(+(amount / 1_000_000_000).toFixed(1)) + ' میلیارد ریال'
  if (amount >= 1_000_000)
    return toPersianDigits(+(amount / 1_000_000).toFixed(0)) + ' میلیون ریال'
  return formatCurrencyFa(amount)
}

export function formatPercentFa(value: number): string {
  return toPersianDigits(Math.round(value)) + '٪'
}

export function formatPhoneFa(phone: string | null | undefined): string {
  if (!phone) return '—'
  const clean = toWesternDigits(phone).replace(/\D/g, '')
  if (clean.length === 11)
    return toPersianDigits(`${clean.slice(0, 4)}-${clean.slice(4, 7)}-${clean.slice(7)}`)
  return toPersianDigits(phone)
}

export function timeAgoFa(date: Date | string): string {
  let d: Date
  if (date instanceof Date) {
    d = date
  } else {
    const raw = date.trim()
    const hasTimezone = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)
    const normalized = hasTimezone ? raw : `${raw.includes('T') ? raw : `${raw}T00:00:00`}Z`
    d = new Date(normalized)
  }
  if (isNaN(d.getTime())) return '—'
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'چند لحظه پیش'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${toPersianDigits(mins)} دقیقه پیش`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${toPersianDigits(days)} روز پیش`
  const months = Math.floor(days / 30)
  if (months < 12) return `${toPersianDigits(months)} ماه پیش`
  return `${toPersianDigits(Math.floor(months / 12))} سال پیش`
}

export function ordinalFa(n: number): string {
  const ordinals = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم']
  return ordinals[n - 1] ?? `${toPersianDigits(n)}ام`
}
