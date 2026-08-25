import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { authApi, type LoginMethod } from '@/api/auth'
import { notificationsApi } from '@/api/notifications'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { fa } from '@/lib/i18n/fa'
import { isValidIranianMobile, normalizeMobile } from '@/lib/utils/phone'
import { toPersianDigits } from '@/lib/utils/persian'
import { useAuthStore } from '@/store/authStore'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNotificationStore } from '@/store/notificationStore'
import AppFooter from '@/components/layout/AppFooter'

type PhoneStep = 'phone' | 'code'

export default function LoginPage() {
  usePageTitle(fa.auth.loginTitle)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const [method, setMethod] = useState<LoginMethod>('email')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('phone')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendAfter, setResendAfter] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (resendAfter <= 0) return
    const t = setInterval(() => setResendAfter((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendAfter])

  const completeLogin = async (user: Parameters<typeof login>[0], token: string) => {
    login(user, token)
    try {
      const gen = await notificationsApi.generate()
      setUnreadCount(gen.data.unread_count)
    } catch {
      /* optional */
    }
    toast.success(`خوش آمدید، ${user.name}`)
    navigate('/')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      await completeLogin(data.user, data.access_token)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isValidIranianMobile(phone)) {
      setError(fa.auth.invalidPhone)
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.sendOtp(normalizeMobile(phone))
      setPhoneStep('code')
      setOtpCode('')
      setResendAfter(data.resend_after)
      toast.success(data.message)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (otpCode.replace(/\D/g, '').length < 4) {
      setError(fa.auth.invalidOtp)
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.verifyOtp(normalizeMobile(phone), otpCode.replace(/\D/g, ''))
      await completeLogin(data.user, data.access_token)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendAfter > 0) return
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.sendOtp(normalizeMobile(phone))
      setResendAfter(data.resend_after)
      toast.success(fa.auth.otpResent)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        fa.toast.error
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const switchMethod = (next: LoginMethod) => {
    setMethod(next)
    setError('')
    setPhoneStep('phone')
    setOtpCode('')
    setResendAfter(0)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="flex flex-1 items-center justify-center px-4">
        <Toaster position="bottom-left" richColors />
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img
              src="/padisar-logo.png"
              alt="Padisar Informatics"
              className="mx-auto h-24 w-auto max-w-[220px] object-contain"
            />
            <p className="mt-3 text-sm text-gray-500">سیستم مدیریت ارتباط با مشتری</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex rounded-lg border bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => switchMethod('email')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                method === 'email'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {fa.auth.loginWithEmail}
            </button>
            <button
              type="button"
              onClick={() => switchMethod('phone')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                method === 'phone'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {fa.auth.loginWithPhone}
            </button>
          </div>

          {method === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">{fa.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@padisaar.com"
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
          ) : phoneStep === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <p className="text-sm text-gray-500">{fa.auth.otpHint}</p>
              <div>
                <Label htmlFor="phone">{fa.auth.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={fa.auth.phonePlaceholder}
                  required
                  autoComplete="tel"
                />
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
                  fa.auth.sendOtp
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-sm text-gray-600">
                {fa.auth.otpSentTo(normalizeMobile(phone))}
              </p>
              <div>
                <Label htmlFor="otp">{fa.auth.otpCode}</Label>
                <Input
                  id="otp"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="۱۲۳۴۵۶"
                  required
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-widest"
                />
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
                  fa.auth.verifyOtp
                )}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => { setPhoneStep('phone'); setError(''); setOtpCode('') }}
                >
                  {fa.auth.changePhone}
                </button>
                <button
                  type="button"
                  className="text-primary hover:underline disabled:text-gray-400"
                  disabled={resendAfter > 0 || loading}
                  onClick={handleResendOtp}
                >
                  {resendAfter > 0
                    ? fa.auth.resendAfter(toPersianDigits(resendAfter))
                    : fa.auth.resendOtp}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
