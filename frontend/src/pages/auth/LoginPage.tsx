import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { authApi } from '@/api/auth'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { fa } from '@/lib/i18n/fa'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNotificationStore } from '@/store/notificationStore'

export default function LoginPage() {
  usePageTitle(fa.auth.loginTitle)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      login(data.user, data.access_token)
      try {
        const gen = await notificationsApi.generate()
        setUnreadCount(gen.data.unread_count)
      } catch {
        /* notifications optional on login */
      }
      toast.success(`خوش آمدید، ${data.user.name}`)
      navigate('/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Toaster position="bottom-left" richColors />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">{fa.auth.loginTitle}</h1>
          <p className="mt-2 text-sm text-gray-500">سیستم مدیریت ارتباط با مشتری</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">{fa.auth.email}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@padisaar.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">{fa.auth.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {fa.actions.submitting}
                </>
              ) : (
                fa.auth.loginButton
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
