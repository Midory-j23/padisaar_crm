import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fa } from '@/lib/i18n/fa'

const tabs = [
  { to: '/reports/opportunities', label: fa.reports.opportunities },
  { to: '/reports/activities', label: fa.reports.activities },
  { to: '/reports/win-loss', label: fa.reports.winLoss },
]

export default function ReportsLayout() {
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
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
