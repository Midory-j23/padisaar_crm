import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: Boolean(token),
    isManager: user?.role === 'MANAGER',
    isExpert: user?.role === 'EXPERT',
  }
}
