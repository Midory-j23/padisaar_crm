import { Navigate, Route, Routes } from 'react-router-dom'
import { ManagerRoute } from '@/components/guards/ManagerRoute'
import SettingsLayout from './SettingsLayout'
import PersonalSettingsPage from './PersonalSettingsPage'
import UsersPage from './UsersPage'
import ImportPage from './ImportPage'
import AuditLogPage from './AuditLogPage'
import ErrorReportsPage from './ErrorReportsPage'

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<PersonalSettingsPage />} />
        <Route
          path="users"
          element={
            <ManagerRoute>
              <UsersPage />
            </ManagerRoute>
          }
        />
        <Route
          path="import"
          element={
            <ManagerRoute>
              <ImportPage />
            </ManagerRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ManagerRoute>
              <AuditLogPage />
            </ManagerRoute>
          }
        />
        <Route
          path="errors"
          element={
            <ManagerRoute>
              <ErrorReportsPage />
            </ManagerRoute>
          }
        />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Route>
    </Routes>
  )
}
