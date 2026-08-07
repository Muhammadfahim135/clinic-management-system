import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Activity, 
  Calendar, 
  CreditCard, 
  Plus, 
  Clock, 
  Search, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  UserCheck,
  FileText,
  UserPlus
} from 'lucide-react';

interface Appointment {
  id: string;
  patient_id: string;
  appointment_time: string;
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
  patient_name: string;
  patient_code: string;
}

interface RecentPatient {
  id: string;
  patient_name: string;
  patient_code: string;
  last_visit_date: string | null;
}

interface RecentPayment {
  id: string;
  amount_received: string | number;
  payment_method: string;
  payment_date: string;
  bill_number: string;
  patient_name: string;
  patient_id: string;
}

interface DashboardSummary {
  todayTotalPatients: number;
  todayAppointments: number;
  todayRevenue: number | null;
  totalRegisteredPatients: number;
  pendingPayments: number | null;
  completedAppointments: number;
}

interface PatientLookupItem {
  id: string;
  patient_code: string;
  name: string;
  cnic: string;
}

export const Dashboard = () => {
  const { user, apiFetch } = useAuth();
  const navigate = useNavigate();

  // Dashboard States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'add-visit' | 'create-prescription' | 'generate-bill' | null>(null);
  const [modalSearchText, setModalSearchText] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<PatientLookupItem[]>([]);
  const [modalSearching, setModalSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isDoctor = user?.role === 'Doctor';
  const isStaff = user?.role === 'Admin' || user?.role === 'Receptionist';

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryData = await apiFetch('/dashboard/summary');
      setSummary(summaryData.summary);

      const apptsData = await apiFetch('/dashboard/appointments');
      setAppointments(apptsData.appointments || []);

      const patientsData = await apiFetch('/dashboard/patients');
      setRecentPatients(patientsData.patients || []);

      if (!isDoctor) {
        const paymentsData = await apiFetch('/dashboard/payments');
        setRecentPayments(paymentsData.payments || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Debounce Patient Search in Modal
  useEffect(() => {
    if (!modalSearchText.trim()) {
      setModalSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setModalSearching(true);
      try {
        const data = await apiFetch(`/patients?query=${encodeURIComponent(modalSearchText)}`);
        setModalSearchResults(data.patients || []);
      } catch (err) {
        console.error('Error fetching patient list:', err);
      } finally {
        setModalSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [modalSearchText, apiFetch]);

  if (!user) return null;

  // Quick Action triggers
  const handleQuickAction = (action: 'add-visit' | 'create-prescription' | 'generate-bill') => {
    setModalAction(action);
    setModalSearchText('');
    setModalSearchResults([]);
    setShowModal(true);
  };

  const handlePatientSelect = async (patient: PatientLookupItem) => {
    if (!modalAction) return;
    
    setActionLoading(true);
    try {
      if (modalAction === 'add-visit') {
        navigate(`/patients/${patient.id}/visits/add`);
        setShowModal(false);
      } else if (modalAction === 'create-prescription') {
        // Fetch patient visits to find latest visit
        const data = await apiFetch(`/patients/${patient.id}/visits`);
        const visits = data.visits || [];
        if (visits.length > 0) {
          const latestVisitId = visits[0].id;
          navigate(`/patients/${patient.id}/visits/${latestVisitId}/prescriptions/add`);
          setShowModal(false);
        } else {
          alert('This patient does not have any recorded visits. Please record a patient visit first.');
          navigate(`/patients/${patient.id}/visits/add`);
          setShowModal(false);
        }
      } else if (modalAction === 'generate-bill') {
        // Fetch patient visits to find latest visit
        const data = await apiFetch(`/patients/${patient.id}/visits`);
        const visits = data.visits || [];
        if (visits.length > 0) {
          const latestVisitId = visits[0].id;
          navigate(`/patients/${patient.id}/visits/${latestVisitId}/bills/add`);
          setShowModal(false);
        } else {
          alert('This patient does not have any recorded visits. Please record a patient visit first.');
          navigate(`/patients/${patient.id}/visits/add`);
          setShowModal(false);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null) return 'N/A';
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return {
          background: 'var(--badge-scheduled-bg)',
          border: '1px solid var(--badge-scheduled-border)',
          color: 'var(--badge-scheduled-color)',
        };
      case 'Checked In':
        return {
          background: 'var(--badge-checked-in-bg)',
          border: '1px solid var(--badge-checked-in-border)',
          color: 'var(--badge-checked-in-color)',
        };
      case 'Completed':
        return {
          background: 'var(--badge-completed-bg)',
          border: '1px solid var(--badge-completed-border)',
          color: 'var(--badge-completed-color)',
        };
      case 'Cancelled':
        return {
          background: 'var(--badge-cancelled-bg)',
          border: '1px solid var(--badge-cancelled-border)',
          color: 'var(--badge-cancelled-color)',
        };
      case 'No Show':
        return {
          background: 'var(--badge-noshow-bg)',
          border: '1px solid var(--badge-noshow-border)',
          color: 'var(--badge-noshow-color)',
        };
      default:
        return {};
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Welcome text */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Welcome back, {user.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
          Here is a quick overview of clinical actions and metrics.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '2rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 6 Summary Cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Retrieving summary...</span>
        </div>
      ) : summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          
          {/* Card 1: Today's Total Patients */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Today's Patients</h4>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{summary.todayTotalPatients}</p>
            </div>
          </div>

          {/* Card 2: Today's Appointments */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Today's Bookings</h4>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{summary.todayAppointments}</p>
            </div>
          </div>

          {/* Card 3: Today's Revenue */}
          {!isDoctor && (
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Today's Revenue</h4>
                <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.1rem' }}>
                  {formatCurrency(summary.todayRevenue)}
                </p>
              </div>
            </div>
          )}

          {/* Card 4: Total Registered Patients */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-role-admin)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Total Patients</h4>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{summary.totalRegisteredPatients}</p>
            </div>
          </div>

          {/* Card 5: Pending Payments */}
          {!isDoctor && (
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Pending Dues</h4>
                <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '0.1rem' }}>
                  {formatCurrency(summary.pendingPayments)}
                </p>
              </div>
            </div>
          )}

          {/* Card 6: Completed Appointments */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--color-role-receptionist)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Completed Appts</h4>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{summary.completedAppointments}</p>
            </div>
          </div>

        </div>
      )}

      {/* Widgets & Layout Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Widget 1: Today's Appointments */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--color-warning)' }} />
              <span>Today's Appointment Queue</span>
            </h2>
            <Link to="/appointments" style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
              See All
            </Link>
          </div>

          <div style={{ flexGrow: 1 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : appointments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                No appointments booked for today.
              </p>
            ) : (
              <div className="data-table-container" style={{ border: 'none', background: 'transparent' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((app) => (
                      <tr key={app.id} onClick={() => navigate(`/appointments/${app.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600, color: 'white', padding: '0.75rem 0.5rem' }}>
                          {app.appointment_time.slice(0, 5)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 500, color: 'white' }}>{app.patient_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{app.patient_code}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', ...getStatusStyle(app.status) }}>
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Recent Patients */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Recent Clinic Patients</span>
            </h2>
            <Link to="/patients" style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
              Search Registry
            </Link>
          </div>

          <div style={{ flexGrow: 1 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : recentPatients.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                No active patients registered yet.
              </p>
            ) : (
              <div className="data-table-container" style={{ border: 'none', background: 'transparent' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient Details</th>
                      <th>Last Visit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((p) => (
                      <tr key={p.id} onClick={() => navigate(`/patients/${p.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 500, color: 'white' }}>{p.patient_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.patient_code}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}>
                          {p.last_visit_date 
                            ? new Date(p.last_visit_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No visits registered'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Widget 3: Recent Payments (Admin/Receptionist only) */}
        {!isDoctor && (
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} style={{ color: 'var(--color-success)' }} />
                <span>Recent Cash Receipts</span>
              </h2>
              <Link to="/billing" style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                Billing Records
              </Link>
            </div>

            <div style={{ flexGrow: 1 }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : recentPayments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
                  No payments recorded today.
                </p>
              ) : (
                <div className="data-table-container" style={{ border: 'none', background: 'transparent' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Receipt details</th>
                        <th>Method</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((pay) => (
                        <tr key={pay.id} onClick={() => navigate(`/patients/${pay.patient_id}/bills`)} style={{ cursor: 'pointer' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <div style={{ fontWeight: 500, color: 'white' }}>{pay.bill_number}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pay.patient_name}</div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}>
                            {pay.payment_method}
                          </td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600, padding: '0.75rem 0.5rem' }}>
                            {formatCurrency(Number(pay.amount_received))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widget 4: Quick Actions Shortcuts */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Plus size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Operational Quick Actions</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', flexGrow: 1 }}>
            
            {/* Action 1: Register Patient */}
            <button
              onClick={() => navigate('/patients/register')}
              className="btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: 'var(--border-radius-sm)',
                height: '90px'
              }}
            >
              <UserPlus size={20} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Register Patient</span>
            </button>

            {/* Action 2: Search Patient */}
            <button
              onClick={() => navigate('/patients')}
              className="btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: 'var(--border-radius-sm)',
                height: '90px'
              }}
            >
              <Search size={20} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Search Patient</span>
            </button>

            {/* Action 3: Book Appointment */}
            {isStaff && (
              <button
                onClick={() => navigate('/appointments/book')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 'var(--border-radius-sm)',
                  height: '90px'
                }}
              >
                <Calendar size={20} style={{ color: 'var(--color-warning)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Book Appt</span>
              </button>
            )}

            {/* Action 4: Add Visit */}
            <button
              onClick={() => handleQuickAction('add-visit')}
              className="btn-secondary"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: 'var(--border-radius-sm)',
                height: '90px'
              }}
            >
              <Activity size={20} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Add Visit Log</span>
            </button>

            {/* Action 5: Create Prescription */}
            {!isDoctor ? (
              // If receptionist, we hide/disable, or let doctor/admin create
              user.role === 'Admin' && (
                <button
                  onClick={() => handleQuickAction('create-prescription')}
                  className="btn-secondary"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    borderRadius: 'var(--border-radius-sm)',
                    height: '90px'
                  }}
                >
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Create Rx</span>
                </button>
              )
            ) : (
              // Doctor can create prescription
              <button
                onClick={() => handleQuickAction('create-prescription')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 'var(--border-radius-sm)',
                  height: '90px'
                }}
              >
                <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Create Rx</span>
              </button>
            )}

            {/* Action 6: Generate Bill */}
            {isStaff && (
              <button
                onClick={() => handleQuickAction('generate-bill')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 'var(--border-radius-sm)',
                  height: '90px'
                }}
              >
                <CreditCard size={20} style={{ color: 'var(--color-role-admin)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Generate Bill</span>
              </button>
            )}

          </div>
        </div>

      </div>

      {/* QUICK ACTION PATIENT LOOKUP MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                {modalAction === 'add-visit' && 'Select Patient to Add Visit'}
                {modalAction === 'create-prescription' && 'Select Patient to Create Prescription'}
                {modalAction === 'generate-bill' && 'Select Patient to Generate Invoice'}
              </h3>
              <button onClick={() => setShowModal(false)} className="modal-close" disabled={actionLoading}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="input-wrapper">
                <Search className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search patient by Name, ID, CNIC, or Contact Number..."
                  value={modalSearchText}
                  onChange={(e) => setModalSearchText(e.target.value)}
                  disabled={actionLoading}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)' }}>
              {modalSearching ? (
                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Searching patients...</span>
                </div>
              ) : modalSearchResults.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {modalSearchText ? 'No patients matched your search.' : 'Type to search patient registry...'}
                </div>
              ) : (
                modalSearchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => !actionLoading && handlePatientSelect(patient)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: actionLoading ? 0.6 : 1,
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseEnter={(e) => { if (!actionLoading) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{patient.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {patient.patient_code} • CNIC: {patient.cnic}
                      </div>
                    </div>
                    {actionLoading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <ArrowRight size={16} style={{ color: 'var(--color-primary)' }} />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
