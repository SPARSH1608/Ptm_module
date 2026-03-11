import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import CalendarView from './pages/CalendarView';
import MeetsView from './pages/MeetsView';
import StudentFormsView from './pages/StudentFormsView';
import SettingsView from './pages/SettingsView';
import GoogleCallback from './pages/GoogleCallback';
import AdminFormManager from './pages/AdminFormManager';

import { AuthProvider, useAuth } from './contexts/AuthContext';

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return user.role === 'ADMIN'
    ? <Navigate to="admin/forms" replace />
    : <Navigate to="calendar" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/google-callback" element={<GoogleCallback />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<RoleRedirect />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="meets" element={<MeetsView />} />
            <Route path="forms" element={<StudentFormsView />} />
            <Route path="admin/forms" element={<AdminFormManager />} />
            <Route path="settings" element={<SettingsView />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
