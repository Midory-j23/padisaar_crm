import { cn } from '@/lib/utils'

const COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-teal-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-amber-600',
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return name.slice(0, 2)
}

export function ContactAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const color = COLORS[hashName(name) % COLORS.length]
  const sizeClass =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-12 w-12 text-sm'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        color,
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}

export function sentimentLabel(sentiment?: string | null): string {
  if (sentiment === 'CHAMPION') return '⭐ '
  if (sentiment === 'OPPONENT') return '⚠️ '
  return ''
}
