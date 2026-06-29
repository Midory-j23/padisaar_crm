import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { activitiesApi } from '@/api/activities'
import { Button } from '@/components/ui/Button'
import { activityIcon, attachmentUrl, followUpChipClass } from '@/lib/activityUtils'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import type { Activity } from '@/types'

interface ActivityDetailDrawerProps {
  activityId: string | null
  onClose: () => void
  onUpdated: () => void
  onEdit: (activity: Activity) => void
}

export default function ActivityDetailDrawer({
  activityId,
  onClose,
  onUpdated,
  onEdit,
}: ActivityDetailDrawerProps) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState(false)

  useEffect(() => {
    if (!activityId) {
      setActivity(null)
      return
    }
    setLoading(true)
    activitiesApi.get(activityId).then(({ data }) => setActivity(data)).catch(() => {
      toast.error('فعالیت یافت نشد')
      onClose()
    }).finally(() => setLoading(false))
  }, [activityId, onClose])

  const handleCompleteFollowup = async (checked: boolean) => {
    if (!activity || !checked) return
    try {
      const { data } = await activitiesApi.completeFollowup(activity.id)
      setActivity(data)
      toast.success(fa.toast.followUpDone)
      onUpdated()
    } catch {
      toast.error(fa.toast.error)
    }
  }

  if (!activityId) return null

  const url = attachmentUrl(activity?.attachment_url)
  const isImage = url && /\.(jpg|jpeg|png)$/i.test(url)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">جزئیات فعالیت</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading || !activity ? (
            <p className="text-center text-gray-500">{fa.actions.loading}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activityIcon(activity.activity_type)}</span>
                <div>
                  <p className="font-semibold">{enumLabel('activity_type', activity.activity_type)}</p>
                  <p className="text-sm text-gray-500">{toJalaliDateTime(activity.activity_date)}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">سازمان:</span> {activity.account_name}</p>
                {activity.opportunity_title && (
                  <p><span className="text-gray-500">فرصت:</span> {activity.opportunity_title}</p>
                )}
                {activity.contact_name && (
                  <p><span className="text-gray-500">مخاطب:</span> {activity.contact_name}</p>
                )}
                <p><span className="text-gray-500">ثبت‌کننده:</span> {activity.created_by_name}</p>
              </div>
              {activity.meeting_notes && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">{fa.activities.notes}</p>
                  <div className={`prose prose-sm max-w-none text-sm ${!expandedNotes ? 'line-clamp-6' : ''}`}>
                    <ReactMarkdown>{activity.meeting_notes}</ReactMarkdown>
                  </div>
                  {activity.meeting_notes.length > 120 && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-primary"
                      onClick={() => setExpandedNotes(!expandedNotes)}
                    >
                      {expandedNotes ? 'کمتر' : `... ${fa.activities.more}`}
                    </button>
                  )}
                </div>
              )}
              {activity.outcome && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">{fa.activities.outcome}</p>
                  <p className="text-sm text-gray-600">{activity.outcome}</p>
                </div>
              )}
              {activity.next_step && (
                <span className={`inline-block rounded-full px-3 py-1 text-xs ${followUpChipClass(activity)}`}>
                  {activity.next_step}
                  {activity.follow_up_date && ` — ${toJalaliDateTime(activity.follow_up_date)}`}
                </span>
              )}
              {activity.follow_up_date && !activity.follow_up_completed && (
                <label className="checkbox-label flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activity.follow_up_completed}
                    onChange={(e) => handleCompleteFollowup(e.target.checked)}
                  />
                  <span className="text-sm">{fa.activities.followUpDone}</span>
                </label>
              )}
              {url && (
                <div>
                  <p className="mb-2 text-sm font-medium">{fa.activities.attachment}</p>
                  {isImage ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="پیوست" className="max-h-48 rounded border" />
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                      📄 دانلود PDF
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {activity && (
          <div className="border-t p-4">
            <Button variant="outline" className="w-full" onClick={() => onEdit(activity)}>
              {fa.actions.edit}
            </Button>
          </div>
        )}
      </aside>
    </>
  )
}
