import { Route, Routes } from 'react-router-dom'
import ActivitiesPage from './ActivitiesPage'

export default function ActivitiesRoutes() {
  return (
    <Routes>
      <Route index element={<ActivitiesPage />} />
    </Routes>
  )
}
