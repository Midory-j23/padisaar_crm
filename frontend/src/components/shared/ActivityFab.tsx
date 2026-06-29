import { Plus } from 'lucide-react'
import { useState } from 'react'
import ActivityFormModal from '@/pages/activities/ActivityFormModal'

export default function ActivityFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        data-print-hide
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-light"
        title="ثبت فعالیت"
      >
        <Plus className="h-6 w-6" />
      </button>
      <ActivityFormModal open={open} onOpenChange={setOpen} onSuccess={() => setOpen(false)} />
    </>
  )
}
