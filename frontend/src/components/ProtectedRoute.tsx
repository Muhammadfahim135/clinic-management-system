import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  LogOut, 
  Calendar, 
  FileText, 
  CreditCard, 
  Search, 
  UserPlus,
  BarChart2,
  Settings,
  FileSearch,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        gap: '1rem'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(14, 165, 233, 0.1)',
          borderTopColor: '#0ea5e9',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', letterSpacing: '1px' }}>SECURE CLINIC AUTH...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if role is unauthorized
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Determine active menu path
  const currentPath = location.pathname;

  // Render Protected Layout Wrapper
  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <UserCheck />
          </div>
          <span className="sidebar-title">Clinic Core</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <ul className="sidebar-menu">
            <li className={`sidebar-item ${currentPath === '/dashboard' ? 'active' : ''}`}>
              <Link to="/dashboard">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
            </li>

            {/* Admin Only Route */}
            {user.role === 'Admin' && (
              <li className={`sidebar-item ${currentPath === '/admin/users' ? 'active' : ''}`}>
                <Link to="/admin/users">
                  <Users size={18} />
                  <span>User Management</span>
                </Link>
              </li>
            )}

            <li className={`sidebar-item ${currentPath === '/patients/register' ? 'active' : ''}`}>
              <Link to="/patients/register">
                <UserPlus size={18} />
                <span>Register Patient</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath === '/patients' ? 'active' : ''}`}>
              <Link to="/patients">
                <Search size={18} />
                <span>Patient Search</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath.startsWith('/appointments') ? 'active' : ''}`}>
              <Link to="/appointments">
                <Calendar size={18} />
                <span>Appointments</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath.startsWith('/prescriptions') ? 'active' : ''}`}>
              <Link to="/prescriptions">
                <FileText size={18} />
                <span>Prescriptions</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath.startsWith('/billing') ? 'active' : ''}`}>
              <Link to="/billing">
                <CreditCard size={18} />
                <span>Billing & Pay</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath.startsWith('/reports') ? 'active' : ''}`}>
              <Link to="/reports">
                <BarChart2 size={18} />
                <span>Reports & Analytics</span>
              </Link>
            </li>

            <li className={`sidebar-item ${currentPath === '/settings' ? 'active' : ''}`}>
              <Link to="/settings">
                <Settings size={18} />
                <span>Settings</span>
              </Link>
            </li>

            {user.role === 'Admin' && (
              <li className={`sidebar-item ${currentPath === '/audit-logs' ? 'active' : ''}`}>
                <Link to="/audit-logs">
                  <FileSearch size={18} />
                  <span>Audit Logs</span>
                </Link>
              </li>
            )}
          </ul>

        </nav>

        {/* User profile section in Sidebar footer */}
        <div className="sidebar-profile">
          <div className="profile-info">
            <span className="profile-name" title={user.name}>{user.name}</span>
            <span className={`profile-role-badge role-${user.role.toLowerCase()}`}>
              {user.role}
            </span>
          </div>
          <button 
            className="logout-btn" 
            onClick={logout} 
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="main-wrapper">
        <header className="navbar">
          <div className="nav-search">
            <span>Role Access Level: <strong>{user.role}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Logged in as: <strong>{user.email}</strong>
            </div>
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme} 
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              style={{ border: 'none' }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
  );
};
export default ProtectedRoute;
