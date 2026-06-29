import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fa } from '@/lib/i18n/fa'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  usePageTitle(fa.errors.unauthorized_title)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <Shield className="h-16 w-16 text-red-400" />
      <h1 className="text-2xl font-bold text-gray-900">{fa.errors.unauthorized_title}</h1>
      <p className="max-w-md text-center text-gray-500">{fa.errors.unauthorized}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {fa.actions.back}
        </Button>
        <Button onClick={() => navigate('/')}>{fa.errors.backToDashboard}</Button>
      </div>
    </div>
  )
}
