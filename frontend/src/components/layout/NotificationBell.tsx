import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Clock,
  FileQuestion,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/Button'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { timeAgoFa } from '@/lib/utils/persian'
import { useNotificationStore } from '@/store/notificationStore'
import type { Notification, NotificationType } from '@/types'

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  OVERDUE_FOLLOWUP: AlertCircle,
  UPCOMING_FOLLOWUP: Clock,
  AT_RISK_OPPORTUNITY: AlertTriangle,
  PENDING_WIN_LOSS: FileQuestion,
  STAGE_CHANGE: TrendingUp,
  NEW_ASSIGNMENT: UserPlus,
}

function entityPath(notification: Notification): string | null {
  if (!notification.entity_id) return null
  if (notification.entity_type === 'Activity') {
    return `/activities?id=${notification.entity_id}`
  }
  if (notification.entity_type === 'Opportunity') {
    return `/opportunities/${notification.entity_id}`
  }
  return null
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await notificationsApi.list({ page: 1, per_page: 20 })
      setItems(data.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadNotifications()
  }, [open, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleItemClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationsApi.markRead(notification.id)
        setItems((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    const path = entityPath(notification)
    if (path) navigate(path)
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
        aria-label={fa.notifications.title}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute left-1 top-1 flex h-4 w-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] text-white">
            {unreadCount > 9 ? '۹+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">{fa.notifications.title}</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-500">{fa.actions.loading}</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">{fa.empty.notifications}</p>
            ) : (
              <ul>
                {items.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] ?? Bell
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        className={`flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-right transition hover:bg-gray-50 ${
                          !notification.is_read ? 'bg-blue-50/60' : ''
                        }`}
                        onClick={() => handleItemClick(notification)}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-400">
                            {enumLabel('notification_type', notification.type)} ·{' '}
                            {timeAgoFa(notification.created_at)}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {items.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={handleMarkAllRead}
              >
                {fa.notifications.markAllRead}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
