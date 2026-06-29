import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'red' | 'yellow' | 'gray' | 'green' | 'blue' | 'orange' | 'purple' | 'darkblue'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-gray-100 text-gray-800',
        variant === 'red' && 'bg-red-100 text-red-800',
        variant === 'yellow' && 'bg-yellow-100 text-yellow-800',
        variant === 'gray' && 'bg-gray-100 text-gray-600',
        variant === 'green' && 'bg-green-100 text-green-800',
        variant === 'blue' && 'bg-blue-100 text-blue-800',
        variant === 'orange' && 'bg-orange-100 text-orange-800',
        variant === 'purple' && 'bg-purple-100 text-purple-800',
        variant === 'darkblue' && 'bg-blue-900 text-white',
        className
      )}
    >
      {children}
    </span>
  )
}

export function priorityBadgeVariant(level?: string | null): BadgeProps['variant'] {
  if (level === 'A_STRATEGIC') return 'red'
  if (level === 'B_MEDIUM') return 'yellow'
  return 'gray'
}

export function relationshipBadgeVariant(status?: string | null): BadgeProps['variant'] {
  if (status === 'CURRENT_CLIENT') return 'green'
  if (status === 'NEW_LEAD') return 'blue'
  if (status === 'COMPETITOR') return 'orange'
  return 'gray'
}

export function influenceBadgeVariant(level?: string | null): BadgeProps['variant'] {
  if (level === 'DECISION_MAKER') return 'darkblue'
  if (level === 'TECHNICAL_INFLUENCER') return 'purple'
  if (level === 'BLOCKER') return 'red'
  if (level === 'BUYER') return 'green'
  return 'gray'
}

export function sentimentBadgeVariant(sentiment?: string | null): BadgeProps['variant'] {
  if (sentiment === 'CHAMPION') return 'green'
  if (sentiment === 'OPPONENT') return 'red'
  return 'gray'
}
