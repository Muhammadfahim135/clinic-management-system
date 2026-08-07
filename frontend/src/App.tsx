import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import PatientList from './pages/PatientList';
import PatientForm from './pages/PatientForm';
import PatientProfile from './pages/PatientProfile';
import VisitForm from './pages/VisitForm';
import VisitDetails from './pages/VisitDetails';
import AppointmentList from './pages/AppointmentList';
import AppointmentBook from './pages/AppointmentBook';
import AppointmentEdit from './pages/AppointmentEdit';
import AppointmentDetails from './pages/AppointmentDetails';
import PrescriptionForm from './pages/PrescriptionForm';
import PrescriptionDetails from './pages/PrescriptionDetails';
import PrescriptionList from './pages/PrescriptionList';
import BillingList from './pages/BillingList';
import BillForm from './pages/BillForm';
import BillDetails from './pages/BillDetails';
import Reports from './pages/Reports';
import DailyPatientsReport from './pages/DailyPatientsReport';
import AppointmentReport from './pages/AppointmentReport';
import PatientReport from './pages/PatientReport';
import RevenueReport from './pages/RevenueReport';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';

import { ThemeProvider } from './context/ThemeContext';
import './styles/app.css';


function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Area */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />

          {/* Patient Management Routes */}
          <Route 
            path="/patients" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PatientList />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/register" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PatientForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/edit/:id" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PatientForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PatientProfile />
              </ProtectedRoute>
            } 
          />

          {/* Visit History & Timeline Routes */}
          <Route 
            path="/patients/:id/visits/add" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <VisitForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/visits/:visitId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <VisitDetails />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/visits/:visitId/edit" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <VisitForm />
              </ProtectedRoute>
            } 
          />

          {/* Appointment Management Routes */}
          <Route 
            path="/appointments" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <AppointmentList />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/appointments/book" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                <AppointmentBook />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/appointments/edit/:appointmentId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                <AppointmentEdit />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/appointments/:appointmentId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <AppointmentDetails />
              </ProtectedRoute>
            } 
          />

          {/* Prescription Management Routes */}
          <Route 
            path="/prescriptions" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PrescriptionList />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/visits/:visitId/prescriptions/add" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor']}>
                <PrescriptionForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/visits/:visitId/prescriptions/edit/:prescriptionId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor']}>
                <PrescriptionForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/prescriptions/:prescriptionId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PrescriptionDetails />
              </ProtectedRoute>
            } 
          />

          {/* Billing & Payments Routes */}
          <Route 
            path="/billing" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <BillingList />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/visits/:visitId/bills/add" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                <BillForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/bills/edit/:billId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Receptionist']}>
                <BillForm />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/patients/:id/bills/:billId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <BillDetails />
              </ProtectedRoute>
            } 
          />

          {/* Reports & Analytics Routes */}
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <Reports />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/reports/daily-patients" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <DailyPatientsReport />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/reports/appointments" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <AppointmentReport />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/reports/patients" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <PatientReport />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/reports/revenue" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <RevenueReport />
              </ProtectedRoute>
            } 
          />


          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                <Settings />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />

          {/* Default Route Redirection */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
