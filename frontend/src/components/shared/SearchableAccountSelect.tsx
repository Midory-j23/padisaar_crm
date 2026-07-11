import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import { Input } from '@/components/ui/Input'
import { fa } from '@/lib/i18n/fa'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

interface SearchableAccountSelectProps {
  value: string
  onChange: (accountId: string) => void
  disabled?: boolean
  hasError?: boolean
}

export function SearchableAccountSelect({
  value,
  onChange,
  disabled,
  hasError,
}: SearchableAccountSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Account[]>([])
  const [selectedName, setSelectedName] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) {
      setSelectedName('')
      return
    }
    accountsApi.get(value).then(({ data }) => setSelectedName(data.name)).catch(() => {})
  }, [value])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const { data } = await accountsApi.list({ search: q || undefined, per_page: 20 })
      setResults(data.items)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, open, search])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (account: Account) => {
    onChange(account.id)
    setSelectedName(account.name)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-right text-sm',
          hasError ? 'border-red-500' : 'border-gray-300',
          disabled && 'cursor-not-allowed bg-gray-50 opacity-70',
        )}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? selectedName || fa.actions.loading : fa.activities.selectAccount}
        </span>
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa.actions.search}
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {loading ? (
              <li className="px-3 py-2 text-center text-sm text-gray-500">{fa.actions.loading}</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-center text-sm text-gray-500">{fa.empty.search_results}</li>
            ) : (
              results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-right text-sm hover:bg-slate-50"
                    onClick={() => handleSelect(a)}
                  >
                    {a.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
