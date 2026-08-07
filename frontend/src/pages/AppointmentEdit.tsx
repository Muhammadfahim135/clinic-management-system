import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  Check, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

export const AppointmentEdit = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  // Load states
  const [patientInfo, setPatientInfo] = useState<{ name: string; code: string; cnic: string } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('Scheduled');
  const [status, setStatus] = useState('Scheduled');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/appointments/${appointmentId}`);
        const app = data.appointment;

        setPatientInfo({
          name: app.patient_name,
          code: app.patient_code,
          cnic: app.cnic,
        });

        // Date format: YYYY-MM-DD (extract from timestamp)
        const dateObj = new Date(app.appointment_date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setAppointmentDate(`${yyyy}-${mm}-${dd}`);

        // Time format: HH:MM
        setAppointmentTime(app.appointment_time.slice(0, 5));
        setAppointmentType(app.appointment_type);
        setStatus(app.status);
        setNotes(app.notes || '');
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve appointment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [appointmentId]);

  // Submit edits
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await apiFetch(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          appointmentDate,
          appointmentTime,
          appointmentType,
          status,
          notes: notes.trim(),
        }),
      });

      if (result.success) {
        navigate('/appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save appointment edits.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Top action header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/appointments')} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Modify Booking Slot
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Reschedule or change status details for the patient's consultation slot
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Retrieving consult slot record...</span>
        </div>
      ) : error && !patientInfo ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Booking Record Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
          <Link to="/appointments" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Schedule
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Form container */}
          <div className="glass-card">
            
            {/* Patient indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Rescheduling consult for:</span>
                <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>
                  {patientInfo?.name} ({patientInfo?.code})
                </h4>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Reschedule Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                <div className="form-group">
                  <label className="form-label">Appointment Date *</label>
                  <div className="input-wrapper">
                    <Calendar className="input-icon" />
                    <input
                      type="date"
                      className="form-input"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Appointment Time *</label>
                  <div className="input-wrapper">
                    <Clock className="input-icon" />
                    <input
                      type="time"
                      className="form-input"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

              </div>

              {/* Appointment Type */}
              <div className="form-group">
                <label className="form-label">Appointment Type *</label>
                <select
                  className="form-select"
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Walk-in">Walk-in</option>
                </select>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Appointment Status *</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="Scheduled">Scheduled (Reserved)</option>
                  <option value="Checked In">Checked In (In Queue)</option>
                  <option value="Completed">Completed (Consult Finished)</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No Show">No Show</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Consultation Notes / Reason for Change</label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.75rem', height: '100px', resize: 'vertical' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
              </div>

              {/* Error banner */}
              {error && (
                <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions footer */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <Link to="/appointments" className="btn-secondary">
                  Cancel
                </Link>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>

          {/* Context panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Rescheduling Rules
              </h3>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  Changing an appointment status to <strong>Checked In</strong> will notify the consulting doctor and add the patient to the active doctor queue.
                </li>
                <li>
                  Changing a status to <strong>Completed</strong> implies the doctor has finished consultation and logs vitals/prescriptions.
                </li>
                <li>
                  If a patient fails to show up within 30 minutes of their slot, mark the status as <strong>No Show</strong> to clear the queue slot.
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
export default AppointmentEdit;
