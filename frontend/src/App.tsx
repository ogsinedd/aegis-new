import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout'; // Import Layout
import HostsPage from './pages/HostsPage'; // Adjusted path
import ContainersPage from './pages/ContainersPage';
import ScanHistoryPage from './pages/ScanHistoryPage'; // Import ScanHistoryPage
import VulnerabilitiesPage from './pages/VulnerabilitiesPage'; // Import VulnerabilitiesPage
import SettingsPage from './pages/SettingsPage'; // Import SettingsPage

// Placeholder for Dashboard page
const DashboardPage = () => <div className="text-3xl font-bold">Dashboard (Coming Soon)</div>;

function App() {
  return (
    <Routes>
      <Route element={<Layout />}> {/* Wrap routes with Layout */}
        <Route path="/" element={<Navigate to="/hosts" replace />} />
        <Route path="/hosts" element={<HostsPage />} /> 
        <Route path="/hosts/:hostId/containers" element={<ContainersPage />} />
        <Route path="/history" element={<ScanHistoryPage />} /> {/* Use ScanHistoryPage */}
        <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} /> {/* Use VulnerabilitiesPage */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} /> {/* Optional: Dashboard route */}
        {/* TODO: Add a 404 Not Found page */}
        <Route path="*" element={<Navigate to="/hosts" replace />} /> 
      </Route>
    </Routes>
  );
}

export default App;
