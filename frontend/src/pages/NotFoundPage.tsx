import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { fa } from '@/lib/i18n/fa'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  const navigate = useNavigate()
  usePageTitle(fa.errors.not_found)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
      <span className="text-8xl font-bold text-primary">۴۰۴</span>
      <h1 className="text-2xl font-bold text-gray-900">{fa.errors.not_found}</h1>
      <p className="max-w-md text-center text-gray-500">{fa.errors.not_found_hint}</p>
      <Button onClick={() => navigate('/')}>{fa.errors.backToDashboard}</Button>
    </div>
  )
}
