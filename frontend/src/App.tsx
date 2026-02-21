import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import ManagersPage from './pages/ManagersPage'
import OfficesPage from './pages/OfficesPage'
import StarAssistantPage from './pages/StarAssistantPage'
import ImportPage from './pages/ImportPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/managers" element={<ManagersPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/star" element={<StarAssistantPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Route>
    </Routes>
  )
}
