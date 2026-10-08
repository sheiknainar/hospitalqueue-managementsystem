import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { DoctorsPage } from './pages/admin/DoctorsPage';
import { PatientsPage } from './pages/admin/PatientsPage';
import { AppointmentsPage } from './pages/admin/AppointmentsPage';
import { QueueMonitorPage } from './pages/admin/QueueMonitorPage';

// Doctor pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage';

// Patient pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage';
import { AppointmentHistoryPage } from './pages/patient/AppointmentHistoryPage';

// Common
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { UserRole } from './types/database';

// Protected Route Guard
const ProtectedRoute: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactElement;
}> = ({ allowedRoles, children }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Redirect to user's assigned role dashboard
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    return <Navigate to="/patient" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="queue" element={<QueueMonitorPage />} />
          </Route>

          {/* Doctor Routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointmentsPage />} />
          </Route>

          {/* Patient Routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PatientDashboard />} />
            <Route path="book" element={<BookAppointmentPage />} />
            <Route path="history" element={<AppointmentHistoryPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
