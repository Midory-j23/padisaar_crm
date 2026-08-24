import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { errorsApi } from '@/api/errors'
import Header from './Header'
import Sidebar from './Sidebar'
import AppFooter from './AppFooter'
import ActivityFab from '@/components/shared/ActivityFab'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fa } from '@/lib/i18n/fa'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNotificationStore } from '@/store/notificationStore'
import { usePermissions } from '@/hooks/usePermissions'

const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  '/': { title: fa.dashboard.title, breadcrumb: [fa.nav.dashboard] },
  '/accounts': { title: fa.accounts.title, breadcrumb: [fa.nav.dashboard, fa.nav.accounts] },
  '/contacts': { title: fa.nav.contacts, breadcrumb: [fa.nav.dashboard, fa.nav.contacts] },
  '/opportunities': {
    title: fa.nav.opportunities,
    breadcrumb: [fa.nav.dashboard, fa.nav.opportunities],
  },
  '/activities': { title: fa.nav.activities, breadcrumb: [fa.nav.dashboard, fa.nav.activities] },
  '/reports': { title: fa.nav.reports, breadcrumb: [fa.nav.dashboard, fa.nav.reports] },
  '/settings': { title: fa.settings.title, breadcrumb: [fa.nav.dashboard, fa.nav.settings] },
  '/settings/users': { title: fa.settings.users, breadcrumb: [fa.nav.dashboard, fa.nav.settings, fa.settings.users] },
  '/settings/import': { title: fa.settings.import, breadcrumb: [fa.nav.dashboard, fa.nav.settings, fa.settings.import] },
  '/settings/audit': { title: fa.settings.audit, breadcrumb: [fa.nav.dashboard, fa.nav.settings, fa.settings.audit] },
  '/settings/errors': { title: fa.settings.errors, breadcrumb: [fa.nav.dashboard, fa.nav.settings, fa.settings.errors] },
  '/reports/opportunities': { title: fa.reports.opportunities, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.opportunities] },
  '/reports/activities': { title: fa.reports.activities, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.activities] },
  '/reports/win-loss': { title: fa.reports.winLoss, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.winLoss] },
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const { isManager } = usePermissions()
  const [openErrors, setOpenErrors] = useState(0)

  useEffect(() => {
    const refreshNotifications = async () => {
      try {
        await notificationsApi.generate()
        const { data } = await notificationsApi.unreadCount()
        setUnreadCount(data.count)
      } catch {
        /* ignore polling errors */
      }
    }

    refreshNotifications()
    const interval = setInterval(refreshNotifications, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [setUnreadCount])

  useEffect(() => {
    if (!isManager) return
    errorsApi
      .openCount()
      .then(({ data }) => setOpenErrors(data.count))
      .catch(() => {})
  }, [isManager, location.pathname])

  const basePath = location.pathname.replace(/\/$/, '') || '/'
  const pageInfo =
    pageTitles[basePath] ??
    pageTitles[location.pathname.split('/').slice(0, 2).join('/') || '/'] ??
    pageTitles['/']

  usePageTitle(pageInfo.title)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col lg:mr-64">
        <Header
          title={pageInfo.title}
          breadcrumb={pageInfo.breadcrumb}
          onMenuClick={() => setSidebarOpen(true)}
        />
        {isManager && openErrors > 0 && !location.pathname.startsWith('/settings/errors') && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 lg:px-6" data-print-hide>
            <Link
              to="/settings/errors"
              className="flex items-center gap-2 text-sm text-amber-900 hover:underline"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {fa.settings.openErrorsBanner(openErrors)}
            </Link>
          </div>
        )}
        <main className="flex-1 p-4 lg:p-6">
          <ErrorBoundary key={location.pathname} compact>
            <Outlet />
          </ErrorBoundary>
        </main>
        <AppFooter />
      </div>
      <ActivityFab />
    </div>
  )
}
