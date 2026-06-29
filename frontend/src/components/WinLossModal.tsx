import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { winLossApi } from '@/api/winLoss'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { fa, enumLabel } from '@/lib/i18n/fa'
import { STAGE_TO_FINAL_STATUS } from '@/lib/opportunityConstants'
import type { SalesStage } from '@/types'

interface WinLossModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  targetStage: SalesStage
  onComplete: (savedAnalysis: boolean) => void
}

export default function WinLossModal({
  open,
  onOpenChange,
  opportunityId,
  targetStage,
  onComplete,
}: WinLossModalProps) {
  const finalStatus = STAGE_TO_FINAL_STATUS[targetStage]
  const [reason, setReason] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [lessons, setLessons] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setContractValue('')
      setLessons('')
    }
  }, [open, opportunityId])

  const handleSave = async () => {
    if (!reason) {
      toast.error('لطفاً دلیل اصلی نتیجه را انتخاب کنید')
      return
    }
    setSubmitting(true)
    try {
      await winLossApi.create({
        opportunity_id: opportunityId,
        final_status: finalStatus,
        result_reason: reason,
        lessons_learned: lessons || undefined,
        final_contract_value: finalStatus === 'WON' && contractValue
          ? Number(contractValue.replace(/,/g, ''))
          : undefined,
      })
      toast.success('تحلیل برد/باخت ثبت شد')
      onOpenChange(false)
      onComplete(true)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLater = () => {
    onOpenChange(false)
    onComplete(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={fa.opportunities.winLoss.title}
      footer={
        <>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? fa.actions.submitting : fa.opportunities.winLoss.save}
          </Button>
          <Button variant="outline" onClick={handleLater}>
            {fa.opportunities.winLoss.later}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{fa.opportunities.winLoss.finalStatus}</Label>
          <Input
            value={enumLabel('final_status', finalStatus)}
            readOnly
            className="bg-gray-50"
          />
        </div>
        <div>
          <Label>{fa.opportunities.winLoss.reason} *</Label>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">انتخاب کنید...</option>
            {Object.entries(fa.enums.result_reason).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        {finalStatus === 'WON' && (
          <div>
            <Label>{fa.opportunities.winLoss.contractValue}</Label>
            <Input
              dir="ltr"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              placeholder="5000000000"
            />
          </div>
        )}
        <div>
          <Label>{fa.opportunities.winLoss.lessons}</Label>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-gray-300 p-3 text-sm"
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="چه چیزی یاد گرفتیم؟"
          />
        </div>
      </div>
    </Dialog>
  )
}
