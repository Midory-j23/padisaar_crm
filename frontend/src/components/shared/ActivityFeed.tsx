import { activityIcon, activityContactLabel, followUpChipClass } from '@/lib/activityUtils'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { toJalaliDateTime } from '@/lib/utils/jalali'
import type { Activity } from '@/types'

interface ActivityFeedProps {
  activities: Activity[]
  onSelect: (id: string) => void
  expandedId?: string | null
}

export default function ActivityFeed({ activities, onSelect, expandedId }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {activities.map((a) => {
        const preview = a.meeting_notes?.slice(0, 120) ?? ''
        const hasMore = (a.meeting_notes?.length ?? 0) > 120
        const expanded = expandedId === a.id

        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-right transition hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{activityIcon(a.activity_type)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{enumLabel('activity_type', a.activity_type)}</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-sm text-gray-600">{a.account_name}</span>
                  {a.opportunity_title && (
                    <>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm text-gray-500">{a.opportunity_title}</span>
                    </>
                  )}
                  {activityContactLabel(a) && (
                    <>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-sm text-gray-500">{activityContactLabel(a)}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">{toJalaliDateTime(a.activity_date)}</p>
                {a.meeting_notes && (
                  <p className="mt-2 text-sm text-gray-600">
                    {expanded ? a.meeting_notes : preview}
                    {hasMore && !expanded && `... ${fa.activities.more}`}
                  </p>
                )}
                {a.next_step && (
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${followUpChipClass(a)}`}>
                    {a.next_step}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
