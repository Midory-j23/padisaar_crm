import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { isManager } = usePermissions()
  return isManager ? <>{children}</> : <Navigate to="/unauthorized" replace />
}
