import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'
import { usePermissions } from '@/hooks/usePermissions'

export default function SettingsLayout() {
  const { isManager } = usePermissions()

  const tabs = [
    { to: '/settings', label: fa.settings.personal, end: true },
    ...(isManager
      ? [
          { to: '/settings/users', label: fa.settings.users, end: false },
          { to: '/settings/import', label: fa.settings.import, end: false },
          { to: '/settings/audit', label: fa.settings.audit, end: false },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-800'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
