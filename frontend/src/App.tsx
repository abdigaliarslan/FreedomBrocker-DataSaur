import { Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/Dashboard';
import TicketsPage from '@/pages/Tickets';
import ManagersPage from '@/pages/Managers';
import OfficesPage from '@/pages/Offices';
import StarAssistantPage from '@/pages/StarAssistant';
import ImportPage from '@/pages/Import';
import MapPage from '@/pages/MapPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/managers" element={<ManagersPage />} />
        <Route path="/offices" element={<OfficesPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/assistant" element={<StarAssistantPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}
