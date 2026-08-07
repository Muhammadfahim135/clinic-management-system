import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Activity, 
  ChevronRight
} from 'lucide-react';


export const Reports = () => {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'Admin';


  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Clinical Reports & Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
          Select a report below to filter, analyze, print, or export clinic activities.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        
        {/* Report 1: Daily Patients Report */}
        <Link to="/reports/daily-patients" className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.75rem',
          transition: 'var(--transition-smooth)',
          cursor: 'pointer',
          borderLeft: '4px solid var(--color-primary)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(14, 165, 233, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
        }}
        >
          <div>
            <div style={{ width: '40px', height: '40px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>

              <Activity size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Daily Patients Report</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Review daily patient traffic and total clinical consult check-ins. Helpful for resource management and planning.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.5rem' }}>
            <span>Open Report</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* Report 2: Appointment Report */}
        <Link to="/reports/appointments" className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.75rem',
          transition: 'var(--transition-smooth)',
          cursor: 'pointer',
          borderLeft: '4px solid var(--color-warning)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
        }}
        >
          <div>
            <div style={{ width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>

              <Calendar size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Appointment Report</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Analyze scheduled, checked-in, completed, cancelled, and no-show appointments. Filter by date, status, or specific patient.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-warning)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.5rem' }}>
            <span>Open Report</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* Report 3: Patient Report */}
        <Link to="/reports/patients" className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.75rem',
          transition: 'var(--transition-smooth)',
          cursor: 'pointer',
          borderLeft: '4px solid var(--color-success)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
        }}
        >
          <div>
            <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>

              <Users size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Patient Report</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Track total registered patient demographics, new patient registration counts, and returning patient clinical trends.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.5rem' }}>
            <span>Open Report</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* Report 4: Revenue Report (Admin only) */}
        {isAdmin && (
          <Link to="/reports/revenue" className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.75rem',
            transition: 'var(--transition-smooth)',
            cursor: 'pointer',
            borderLeft: '4px solid var(--color-role-admin)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(168, 85, 247, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
          }}
          >
            <div>
              <div style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-role-admin)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>

                <CreditCard size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Revenue & Billings Report</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                Audit financial metrics including Total Billed amounts, actual payments received, and outstanding debts. Group by Daily, Weekly, or Monthly.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-role-admin)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1.5rem' }}>
              <span>Open Report</span>
              <ChevronRight size={16} />
            </div>
          </Link>
        )}

      </div>
    </div>
  );
};
export default Reports;
