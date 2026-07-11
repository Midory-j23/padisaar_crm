import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { fa } from '@/lib/i18n/fa'

interface UpdateOpportunityPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  opportunityTitle?: string | null
}

export function UpdateOpportunityPrompt({
  open,
  onOpenChange,
  opportunityId,
  opportunityTitle,
}: UpdateOpportunityPromptProps) {
  const navigate = useNavigate()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={fa.activities.updateOpportunityTitle}
      footer={
        <>
          <Button
            onClick={() => {
              onOpenChange(false)
              navigate(`/opportunities/${opportunityId}`)
            }}
          >
            {fa.activities.updateOpportunityAction}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {fa.activities.updateOpportunityLater}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        {fa.toast.activityLogged}
        {opportunityTitle && (
          <span className="mt-2 block font-medium text-gray-900">{opportunityTitle}</span>
        )}
      </p>
    </Dialog>
  )
}
