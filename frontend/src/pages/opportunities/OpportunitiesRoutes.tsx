import { Route, Routes } from 'react-router-dom'
import OpportunitiesPage from './OpportunitiesPage'
import OpportunityDetailPage from './OpportunityDetailPage'

export default function OpportunitiesRoutes() {
  return (
    <Routes>
      <Route index element={<OpportunitiesPage />} />
      <Route path=":id" element={<OpportunityDetailPage />} />
    </Routes>
  )
}
