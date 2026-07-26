import { Menu, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import NotificationBell from './NotificationBell'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { useAuthStore } from '@/store/authStore'

interface HeaderProps {
  title?: string
  breadcrumb?: string[]
  onMenuClick: () => void
}

export default function Header({ title, breadcrumb, onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-4 lg:px-6" data-print-hide>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            {breadcrumb && breadcrumb.length > 0 && (
              <p className="text-xs text-gray-500">
                {breadcrumb.join(' ‹ ')}
              </p>
            )}
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm font-medium">{user?.name}</span>
            {user?.role && (
              <Badge variant="blue">{enumLabel('role', user.role)}</Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="ml-1 h-4 w-4" />
            {fa.nav.logout}
          </Button>
        </div>
      </div>
    </header>
  )
}
