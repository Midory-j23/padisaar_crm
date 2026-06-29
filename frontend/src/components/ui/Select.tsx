import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
        error ? 'border-red-500' : 'border-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
