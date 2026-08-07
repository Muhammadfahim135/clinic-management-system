import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  FileText,
  UserCheck,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AppointmentDetail {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
  notes: string | null;
  patient_name: string;
  patient_code: string;
  father_name: string;
  gender: string;
  age: number;
  cnic: string;
  creator_name: string;
  doctor_name: string;
  created_at: string;
}

export const AppointmentDetails = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  // Roles verification check
  const isStaff = user?.role === 'Admin' || user?.role === 'Receptionist';

  // State
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAppointmentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/appointments/${appointmentId}`);
      setAppointment(data.appointment);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve appointment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  // Quick Action: Change status
  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const result = await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (result.success) {
        fetchAppointmentDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Cancel
  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(true);
    try {
      const result = await apiFetch(`/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
      });
      if (result.success) {
        fetchAppointmentDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Soft Delete
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment record from history?')) return;
    setActionLoading(true);
    try {
      const result = await apiFetch(`/appointments/${appointmentId}`, {
        method: 'DELETE',
      });
      if (result.success) {
        navigate('/appointments');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete appointment.');
      setActionLoading(false);
    }
  };

  // Return styling parameters for the status badge
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
      
      {/* Top action links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <Link to="/appointments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to Schedule</span>
        </Link>

        {isStaff && appointment && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to={`/appointments/edit/${appointment.id}`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Edit size={14} />
              <span>Edit Slot</span>
            </Link>
            <button 
              className="btn-primary" 
              style={{ width: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'none' }}
              onClick={handleDelete}
              disabled={actionLoading}
            >
              <Trash2 size={14} />
              <span>{actionLoading ? 'Deleting...' : 'Delete Record'}</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading consult slot sheet...</span>
        </div>
      ) : error || !appointment ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Booking Details Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error || 'The requested appointment record could not be loaded.'}</p>
          <Link to="/appointments" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Schedule
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Patient Profile & Appointment parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Patient overview card */}
            <div className="glass-card">
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {appointment.patient_code} - Patient Information
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>
                  {appointment.patient_name}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Father's Name:</span>
                  <p style={{ color: 'white', fontWeight: 500, marginTop: '0.1rem' }}>{appointment.father_name}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>CNIC / Identity Card:</span>
                  <p style={{ color: 'white', fontWeight: 500, marginTop: '0.1rem' }}>{appointment.cnic}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Gender:</span>
                  <p style={{ color: 'white', fontWeight: 500, marginTop: '0.1rem' }}>{appointment.gender}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Age:</span>
                  <p style={{ color: 'white', fontWeight: 500, marginTop: '0.1rem' }}>{appointment.age} years</p>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)', textAlign: 'right' }}>
                <Link to={`/patients/${appointment.patient_id}`} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  View Full Clinical File
                </Link>
              </div>
            </div>

            {/* Notes / Reason for consult card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Appointment Notes & Symptoms</span>
              </h3>
              <p style={{ color: appointment.notes ? 'white' : 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {appointment.notes || 'No custom notes or symptoms recorded during scheduling.'}
              </p>
            </div>

          </div>

          {/* Right Column: Time details, Doctor Assigned, Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Slot Details Card */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Consult Slot Details</span>
                </h3>
                <span 
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    ...getStatusStyle(appointment.status)
                  }}
                >
                  {appointment.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
                  <strong style={{ color: 'white' }}>{new Date(appointment.appointment_date).toLocaleDateString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Time:</span>
                  <strong style={{ color: 'white' }}><Clock size={12} style={{ display: 'inline', marginRight: '0.2rem' }} />{appointment.appointment_time.slice(0, 5)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                  <strong style={{ color: 'white' }}>{appointment.appointment_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Doctor:</span>
                  <strong style={{ color: 'var(--color-role-doctor)' }}>{appointment.doctor_name}</strong>
                </div>
              </div>

              {/* Status workflow transitions for Receptionists / Admins */}
              {isStaff && (
                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '0.75rem' }}>
                    Quick Queue Status Actions:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    
                    {appointment.status === 'Scheduled' && (
                      <button 
                        className="btn-primary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem' }}
                        onClick={() => handleUpdateStatus('Checked In')}
                        disabled={actionLoading}
                      >
                        <UserCheck size={16} />
                        <span>Check In Patient (Queue)</span>
                      </button>
                    )}

                    {appointment.status === 'Checked In' && (
                      <button 
                        className="btn-primary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem' }}
                        onClick={() => handleUpdateStatus('Completed')}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={16} />
                        <span>Complete Consult</span>
                      </button>
                    )}

                    {(appointment.status === 'Scheduled' || appointment.status === 'Checked In') && (
                      <button 
                        className="btn-secondary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
                        onClick={handleCancel}
                        disabled={actionLoading}
                      >
                        <XCircle size={16} />
                        <span>Cancel Appointment</span>
                      </button>
                    )}

                    {appointment.status !== 'Completed' && appointment.status !== 'Cancelled' && (
                      <button 
                        className="btn-secondary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem' }}
                        onClick={() => handleUpdateStatus('No Show')}
                        disabled={actionLoading}
                      >
                        <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>Mark as No Show</span>
                      </button>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* Audit / Logs Card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} style={{ color: 'var(--color-success)' }} />
                <span>Audit Logs</span>
              </h3>
              <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <div>
                  <span>Logged in system by:</span>
                  <p style={{ color: 'white', fontWeight: 600, marginTop: '0.1rem' }}>{appointment.creator_name}</p>
                </div>
                <div>
                  <span>Creation Timestamp:</span>
                  <p style={{ color: 'white', fontWeight: 600, marginTop: '0.1rem' }}>
                    {new Date(appointment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
export default AppointmentDetails;
