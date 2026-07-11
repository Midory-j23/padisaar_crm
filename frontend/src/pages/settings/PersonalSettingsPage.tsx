import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { fa } from '@/lib/i18n/fa'
import type { NotificationPrefs } from '@/types'

const PREF_KEYS: (keyof NotificationPrefs)[] = [
  'OVERDUE_FOLLOWUP',
  'UPCOMING_FOLLOWUP',
  'AT_RISK_OPPORTUNITY',
  'STAGE_CHANGE',
  'PENDING_WIN_LOSS',
  'NEW_ASSIGNMENT',
]

const PREF_LABELS: Record<keyof NotificationPrefs, string> = {
  OVERDUE_FOLLOWUP: fa.settings.notifyOverdue,
  UPCOMING_FOLLOWUP: fa.settings.notifyUpcoming,
  AT_RISK_OPPORTUNITY: fa.settings.notifyAtRisk,
  STAGE_CHANGE: fa.settings.notifyStageChange,
  PENDING_WIN_LOSS: fa.settings.notifyWinLoss,
  NEW_ASSIGNMENT: fa.settings.notifyAssignment,
}

export default function PersonalSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    authApi
      .getNotificationPrefs()
      .then(({ data }) => setPrefs(data))
      .catch(() => toast.error(fa.toast.error))
      .finally(() => setPrefsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('رمز عبور جدید و تکرار آن یکسان نیست')
      return
    }
    if (newPassword.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast.success(fa.settings.passwordChanged)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePrefs = async () => {
    if (!prefs) return
    setSavingPrefs(true)
    try {
      const { data } = await authApi.updateNotificationPrefs(prefs)
      setPrefs(data)
      toast.success(fa.settings.prefsSaved)
    } catch {
      toast.error(fa.toast.error)
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-md">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{fa.settings.changePassword}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="current">{fa.settings.currentPassword}</Label>
              <Input
                id="current"
                type="password"
                dir="ltr"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new">{fa.settings.newPassword}</Label>
              <Input
                id="new"
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm">{fa.settings.confirmPassword}</Label>
              <Input
                id="confirm"
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? fa.actions.submitting : fa.actions.save}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{fa.settings.notificationPrefs}</h2>
          {prefsLoading || !prefs ? (
            <p className="text-sm text-gray-500">{fa.actions.loading}</p>
          ) : (
            <div className="space-y-3">
              {PREF_KEYS.map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                  />
                  <span className="text-sm">{PREF_LABELS[key]}</span>
                </label>
              ))}
              <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
                {savingPrefs ? fa.actions.submitting : fa.actions.save}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
