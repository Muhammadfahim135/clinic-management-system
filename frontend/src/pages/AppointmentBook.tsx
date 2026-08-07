import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Search, 
  User, 
  Check, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

interface PatientSummary {
  id: string;
  patient_code: string;
  name: string;
  cnic: string;
  father_name: string;
  doctor_name: string;
}

export const AppointmentBook = () => {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  // Form state
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [appointmentTime, setAppointmentTime] = useState(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [appointmentType, setAppointmentType] = useState('Scheduled');
  const [notes, setNotes] = useState('');
  
  // Submit state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform patient search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const data = await apiFetch(`/patients?query=${encodeURIComponent(searchQuery)}`);
      setPatients(data.patients);
      if (data.patients.length === 0) {
        setError('No registered patients found matching that search term.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search patients database.');
    } finally {
      setSearching(false);
    }
  };

  // Submit appointment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please search and select a patient first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatient.id,
          appointmentDate,
          appointmentTime,
          appointmentType,
          notes: notes.trim(),
        }),
      });

      if (result.success) {
        navigate('/appointments');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Action header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/appointments')} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Book Consultation Slot
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Verify patient registry and configure booking parameters below
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left column: Search / Selected Patient and Booking Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Patient Selection */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              Step 1: Select Patient Record
            </h3>

            {!selectedPatient ? (
              /* Search view */
              <div>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div className="input-wrapper" style={{ flexGrow: 1 }}>
                    <Search className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search patient by ID (PAT-xxxxxx), Full Name, CNIC, Phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} disabled={searching}>
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <span>Search</span>}
                  </button>
                </form>

                {/* Search results */}
                {patients.length > 0 && (
                  <div className="data-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Patient Info</th>
                          <th>CNIC</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div>
                                <span style={{ fontWeight: 600, color: 'white' }}>{p.name}</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.patient_code}</div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>{p.cnic}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                type="button" 
                                className="btn-primary" 
                                style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                onClick={() => { setSelectedPatient(p); setError(null); }}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Selected state */
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.15)', padding: '1rem', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'white' }}>{selectedPatient.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Code: <strong>{selectedPatient.patient_code}</strong> | CNIC: {selectedPatient.cnic}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} 
                  onClick={() => { setSelectedPatient(null); setPatients([]); }}
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Form */}
          {selectedPatient && (
            <div className="glass-card" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                Step 2: Configure Appointment Slots
              </h3>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Date and Time selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <div className="input-wrapper">
                      <Calendar className="input-icon" />
                      <input
                        type="date"
                        className="form-input"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Time *</label>
                    <div className="input-wrapper">
                      <Clock className="input-icon" />
                      <input
                        type="time"
                        className="form-input"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        required
                        disabled={loading}
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
                    disabled={loading}
                  >
                    <option value="Scheduled">Scheduled (Reserved Slot)</option>
                    <option value="Walk-in">Walk-in (Immediate/Emergency Check)</option>
                  </select>
                </div>

                {/* Clinical Notes */}
                <div className="form-group">
                  <label className="form-label">Appointment Notes / Symptoms (Optional)</label>
                  <textarea
                    className="form-input"
                    style={{ padding: '0.75rem', height: '100px', resize: 'vertical' }}
                    placeholder="Enter reason for booking, specific complaint symptoms, or scheduling requests..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => navigate('/appointments')} 
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>Book Consult Slot</span>
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

        {/* Right column: Helpful context / Information card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Booking Guidelines
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Walk-in Appointments</strong>: Select this type for quick queues or unscheduled checkups. They automatically appear on the schedule queue.
              </li>
              <li>
                <strong>Scheduled Slots</strong>: Select this for bookings that require pre-allocated slots. Ensure to select dates ahead.
              </li>
              <li>
                <strong>Patient Search</strong>: Search is fast and triggers CNIC, Name, or generated ID matching. A patient must be registered in the registry before setting appointments.
              </li>
              <li>
                <strong>Assigned Physician</strong>: The patient's assigned consultant doctor (assigned during registration) will automatically receive the consult ticket.
              </li>
            </ul>
          </div>

          {error && !selectedPatient && (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default AppointmentBook;
