import { Route, Routes } from 'react-router-dom'
import AccountsPage from './AccountsPage'
import AccountDetailPage from './AccountDetailPage'

export default function AccountsRoutes() {
  return (
    <Routes>
      <Route index element={<AccountsPage />} />
      <Route path=":id" element={<AccountDetailPage />} />
    </Routes>
  )
}
