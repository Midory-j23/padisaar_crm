import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'
import { usePermissions } from '@/hooks/usePermissions'
import { errorsApi } from '@/api/errors'
import { toPersianDigits } from '@/lib/utils/persian'

export default function SettingsLayout() {
  const { isManager } = usePermissions()
  const [openErrors, setOpenErrors] = useState(0)

  useEffect(() => {
    if (!isManager) return
    errorsApi
      .openCount()
      .then(({ data }) => setOpenErrors(data.count))
      .catch(() => {})
  }, [isManager])

  const tabs: { to: string; label: string; end: boolean; badge?: number }[] = [
    { to: '/settings', label: fa.settings.personal, end: true },
    ...(isManager
      ? [
          { to: '/settings/users', label: fa.settings.users, end: false },
          { to: '/settings/import', label: fa.settings.import, end: false },
          { to: '/settings/audit', label: fa.settings.audit, end: false },
          { to: '/settings/errors', label: fa.settings.errors, end: false, badge: openErrors },
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
            {tab.badge ? (
              <span className="mr-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {toPersianDigits(tab.badge)}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
