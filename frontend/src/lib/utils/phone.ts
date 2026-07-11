const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export function normalizeMobile(value: string): string {
  let v = value.trim()
  for (let i = 0; i < PERSIAN_DIGITS.length; i++) {
    v = v.replaceAll(PERSIAN_DIGITS[i]!, String(i))
    v = v.replaceAll(ARABIC_DIGITS[i]!, String(i))
  }
  v = v.replace(/[\s\-()]/g, '')
  if (v.startsWith('+98')) v = `0${v.slice(3)}`
  else if (v.startsWith('98') && v.length === 12) v = `0${v.slice(2)}`
  return v
}

export function isValidIranianMobile(value: string): boolean {
  return /^09\d{9}$/.test(normalizeMobile(value))
}
