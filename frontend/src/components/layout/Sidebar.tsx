import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'
import { usePermissions } from '@/hooks/usePermissions'
import { APP_VERSION } from '@/lib/version'

const navItems = [
  { to: '/', label: fa.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/accounts', label: fa.nav.accounts, icon: Building2 },
  { to: '/contacts', label: fa.nav.contacts, icon: Users },
  { to: '/opportunities', label: fa.nav.opportunities, icon: TrendingUp },
  { to: '/activities', label: fa.nav.activities, icon: CalendarCheck },
  { to: '/reports', label: fa.nav.reports, icon: BarChart3, managerOnly: true },
  { to: '/settings', label: fa.nav.settings, icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { isManager } = usePermissions()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        data-print-hide
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-64 flex-col bg-primary text-white transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <NavLink to="/" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src="/padisar-logo.png"
              alt="Padisar Informatics"
              className="h-11 w-auto max-w-full object-contain object-right"
            />
            <p className="text-base font-medium">سیستم مدیریت ارتباط با مشتری</p>
          </NavLink>
          <button type="button" className="lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems
            .filter((item) => !item.managerOnly || isManager)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-r-4 border-white bg-white/15 font-medium'
                      : 'hover:bg-white/10'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div
          data-print-hide
          className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/60"
        >
          {fa.app.versionLabel(APP_VERSION)}
        </div>
      </aside>
    </>
  )
}
