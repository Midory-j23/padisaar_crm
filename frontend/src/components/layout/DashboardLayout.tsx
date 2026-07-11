import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { notificationsApi } from '@/api/notifications'
import Header from './Header'
import Sidebar from './Sidebar'
import AppFooter from './AppFooter'
import ActivityFab from '@/components/shared/ActivityFab'
import { fa } from '@/lib/i18n/fa'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNotificationStore } from '@/store/notificationStore'

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
  '/reports/opportunities': { title: fa.reports.opportunities, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.opportunities] },
  '/reports/activities': { title: fa.reports.activities, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.activities] },
  '/reports/win-loss': { title: fa.reports.winLoss, breadcrumb: [fa.nav.dashboard, fa.nav.reports, fa.reports.winLoss] },
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

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
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <AppFooter />
      </div>
      <ActivityFab />
    </div>
  )
}
