import { useAuthStore } from '../store/authStore'

export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const isManager = user?.role === 'MANAGER'

  return {
    isManager,
    isExpert: user?.role === 'EXPERT',
    canDelete: isManager,
    canViewReports: isManager,
    canViewAllRecords: isManager,
    canEdit: (assignedToId?: string | null) => {
      if (isManager) return true
      return assignedToId === user?.id
    },
  }
}
