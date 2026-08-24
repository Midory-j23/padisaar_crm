import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import DashboardLayout from './components/layout/DashboardLayout'
import { ManagerRoute } from './components/guards/ManagerRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import ErrorReporter from './components/ErrorReporter'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AccountsRoutes from './pages/accounts/AccountsRoutes'
import ContactsRoutes from './pages/contacts/ContactsRoutes'
import OpportunitiesRoutes from './pages/opportunities/OpportunitiesRoutes'
import ActivitiesRoutes from './pages/activities/ActivitiesRoutes'
import ReportsRoutes from './pages/reports/ReportsRoutes'
import SettingsRoutes from './pages/settings/SettingsRoutes'
import NotFoundPage from './pages/NotFoundPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorReporter />
      <BrowserRouter>
        <Toaster position="bottom-left" richColors />
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/unauthorized"
          element={
            <PrivateRoute>
              <UnauthorizedPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="accounts/*" element={<AccountsRoutes />} />
          <Route path="contacts/*" element={<ContactsRoutes />} />
          <Route path="opportunities/*" element={<OpportunitiesRoutes />} />
          <Route path="activities/*" element={<ActivitiesRoutes />} />
          <Route
            path="reports/*"
            element={
              <ManagerRoute>
                <ReportsRoutes />
              </ManagerRoute>
            }
          />
          <Route path="settings/*" element={<SettingsRoutes />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
