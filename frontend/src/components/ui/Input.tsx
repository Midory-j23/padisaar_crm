import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-right placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
        error ? 'border-red-500' : 'border-gray-300',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
