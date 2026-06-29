import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { activitiesApi } from '@/api/activities'
import { Button } from '@/components/ui/Button'
import ActivityFeed from '@/components/shared/ActivityFeed'
import { EmptyState, LoadingSkeleton } from '@/components/shared/SharedComponents'
import ActivityDetailDrawer from '@/pages/activities/ActivityDetailDrawer'
import ActivityFormModal from '@/pages/activities/ActivityFormModal'
import { fa } from '@/lib/i18n/fa'
import type { Activity } from '@/types'

interface EntityActivitiesTabProps {
  accountId?: string
  opportunityId?: string
  contactId?: string
  lockAccount?: boolean
}

export default function EntityActivitiesTab({
  accountId,
  opportunityId,
  contactId,
  lockAccount,
}: EntityActivitiesTabProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await activitiesApi.list({
        account_id: accountId,
        opportunity_id: opportunityId,
        contact_id: contactId,
        per_page: 50,
      })
      setActivities(data.items)
    } finally {
      setLoading(false)
    }
  }, [accountId, opportunityId, contactId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => { setEditActivity(null); setModalOpen(true) }}>
          <Plus className="ml-1 h-4 w-4" />
          {fa.actions.addActivity}
        </Button>
      </div>
      {activities.length === 0 ? (
        <EmptyState
          title={fa.empty.activities}
          action={
            <Button size="sm" onClick={() => setModalOpen(true)}>{fa.actions.addActivity}</Button>
          }
        />
      ) : (
        <ActivityFeed activities={activities} onSelect={setDrawerId} />
      )}
      <ActivityFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        activity={editActivity}
        defaultAccountId={accountId}
        defaultOpportunityId={opportunityId}
        defaultContactId={contactId}
        lockAccount={lockAccount}
        onSuccess={fetchActivities}
      />
      <ActivityDetailDrawer
        activityId={drawerId}
        onClose={() => setDrawerId(null)}
        onUpdated={fetchActivities}
        onEdit={(a) => { setDrawerId(null); setEditActivity(a); setModalOpen(true) }}
      />
    </div>
  )
}
