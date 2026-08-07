import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  UserCheck,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface AppointmentSummary {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
  notes: string | null;
  patient_name: string;
  patient_code: string;
  doctor_name: string;
}

export const AppointmentList = () => {
  const { apiFetch, user } = useAuth();

  // Roles permission check
  const isStaff = user?.role === 'Admin' || user?.role === 'Receptionist';

  // Filters state
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments list
  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (dateFilter) queryParams.push(`date=${dateFilter}`);
      if (statusFilter) queryParams.push(`status=${statusFilter}`);
      if (searchQuery) queryParams.push(`search=${encodeURIComponent(searchQuery)}`);

      const url = queryParams.length > 0 ? `/appointments?${queryParams.join('&')}` : '/appointments';
      const data = await apiFetch(url);
      setAppointments(data.appointments);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments();
  };

  // Quick action: update status
  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const result = await apiFetch(`/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (result.success) {
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update appointment status.');
    }
  };

  // Quick action: cancel
  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const result = await apiFetch(`/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
      });
      if (result.success) {
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment.');
    }
  };

  // Delete action (soft delete)
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This will soft-delete the record.')) return;
    try {
      const result = await apiFetch(`/appointments/${appointmentId}`, {
        method: 'DELETE',
      });
      if (result.success) {
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete appointment.');
    }
  };

  // Return appropriate CSS badge class based on status
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
      {/* Header action bar */}
      <div className="table-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Appointments Schedule
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage clinic bookings, walk-ins, daily calendars, and patient queue status
          </p>
        </div>

        {isStaff && (
          <Link to="/appointments/book" className="btn-action" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Book Appointment</span>
          </Link>
        )}
      </div>

      {/* Filter and search control bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          
          {/* Keyword Search */}
          <div className="input-wrapper" style={{ flexGrow: 1, minWidth: '240px' }}>
            <Search className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search patient by ID, Name, CNIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date:</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '150px', padding: '0.4rem 0.5rem', fontSize: '0.9rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="form-select"
              style={{ padding: '0.4rem 1.75rem 0.4rem 0.75rem', fontSize: '0.9rem', width: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Checked In">Checked In</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          {/* Search Button */}
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.45rem 1.25rem' }} disabled={loading}>
            Search
          </button>

          {/* Reset Filters */}
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ padding: '0.45rem 1rem' }}
            onClick={() => { setSearchQuery(''); setStatusFilter(''); setDateFilter(''); }}
            disabled={loading}
          >
            Reset
          </button>
        </form>
      </div>

      {/* Main Schedule Table card */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Retrieving bookings...</span>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={fetchAppointments}>Retry</button>
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ color: 'rgba(255,255,255,0.05)', marginBottom: '1rem' }} />
            <p>No appointments found matching the selected filters.</p>
            {isStaff && <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click "Book Appointment" to log a scheduled or walk-in patient slot.</p>}
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Consulting Doctor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div>
                        <Link to={`/patients/${app.patient_id}`} style={{ fontWeight: 600, color: 'white' }}>
                          {app.patient_name}
                        </Link>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {app.patient_code}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, color: 'white' }}>
                          {new Date(app.appointment_date).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                          {app.appointment_time.slice(0, 5)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{app.appointment_type}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.doctor_name}</span>
                    </td>
                    <td>
                      <span 
                        style={{
                          display: 'inline-flex',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          ...getStatusStyle(app.status)
                        }}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        
                        {/* Quick state transitions (Admin/Receptionist only) */}
                        {isStaff && app.status === 'Scheduled' && (
                          <button 
                            className="btn-icon" 
                            style={{ border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.05)' }} 
                            onClick={() => handleUpdateStatus(app.id, 'Checked In')}
                            title="Check In Patient"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        
                        {isStaff && app.status === 'Checked In' && (
                          <button 
                            className="btn-icon" 
                            style={{ border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.05)' }} 
                            onClick={() => handleUpdateStatus(app.id, 'Completed')}
                            title="Complete Consultation"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}

                        {isStaff && (app.status === 'Scheduled' || app.status === 'Checked In') && (
                          <button 
                            className="btn-icon" 
                            style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.05)' }} 
                            onClick={() => handleCancelAppointment(app.id)}
                            title="Cancel Booking"
                          >
                            <XCircle size={14} />
                          </button>
                        )}

                        {/* Standard CRUD buttons */}
                        <Link to={`/appointments/${app.id}`} className="btn-icon" title="View Details">
                          <Eye size={14} />
                        </Link>

                        {isStaff && (
                          <>
                            <Link to={`/appointments/edit/${app.id}`} className="btn-icon edit" title="Edit Booking">
                              <Edit size={14} />
                            </Link>
                            <button 
                              className="btn-icon delete" 
                              onClick={() => handleDeleteAppointment(app.id)}
                              title="Delete Appointment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default AppointmentList;
