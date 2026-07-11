import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center')}>
      <p className="text-lg font-medium text-gray-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
