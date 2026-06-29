import { Route, Routes } from 'react-router-dom'
import ContactsPage from './ContactsPage'
import ContactDetailPage from './ContactDetailPage'

export default function ContactsRoutes() {
  return (
    <Routes>
      <Route index element={<ContactsPage />} />
      <Route path=":id" element={<ContactDetailPage />} />
    </Routes>
  )
}
