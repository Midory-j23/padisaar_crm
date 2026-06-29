export const ACTIVITY_ICONS: Record<string, string> = {
  IN_PERSON_MEETING: '👥',
  PHONE_CALL: '📞',
  SITE_VISIT: '🏗️',
  PROPOSAL_SENT: '📄',
  EMAIL: '✉️',
}

export function activityIcon(type: string): string {
  return ACTIVITY_ICONS[type] ?? '📋'
}

export function followUpChipClass(activity: {
  follow_up_date?: string | null
  follow_up_completed: boolean
  is_follow_up_overdue: boolean
}): string {
  if (!activity.follow_up_date || activity.follow_up_completed) return 'bg-gray-100 text-gray-600'
  if (activity.is_follow_up_overdue) return 'bg-red-100 text-red-700'
  const days = Math.ceil(
    (new Date(activity.follow_up_date).getTime() - Date.now()) / 86400000
  )
  if (days <= 3) return 'bg-yellow-100 text-yellow-800'
  return 'bg-blue-50 text-blue-700'
}

export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export function attachmentUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}
