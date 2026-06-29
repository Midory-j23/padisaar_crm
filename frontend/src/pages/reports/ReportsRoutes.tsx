import { Navigate, Route, Routes } from 'react-router-dom'
import ReportsLayout from './ReportsLayout'
import OpportunitiesReportPage from './OpportunitiesReportPage'
import ActivitiesReportPage from './ActivitiesReportPage'
import WinLossPage from './WinLossPage'

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route element={<ReportsLayout />}>
        <Route index element={<Navigate to="opportunities" replace />} />
        <Route path="opportunities" element={<OpportunitiesReportPage />} />
        <Route path="activities" element={<ActivitiesReportPage />} />
        <Route path="win-loss" element={<WinLossPage />} />
      </Route>
    </Routes>
  )
}
