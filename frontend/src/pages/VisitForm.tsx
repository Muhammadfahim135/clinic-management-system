import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Check,
  ClipboardList,
  HeartPulse
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  email: string;
}

export const VisitForm = () => {
  const { id: patientId, visitId } = useParams<{ id: string; visitId?: string }>();
  const isEditMode = !!visitId;

  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  // Core details
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [doctorId, setDoctorId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [temperatureF, setTemperatureF] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Fetch doctors, patient name, and visit details if editing
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch doctors list
        const docRes = await apiFetch('/users/doctors');
        setDoctors(docRes.doctors || []);

        // 2. Fetch patient details to get patient name/code & default doctor
        const patientRes = await apiFetch(`/patients/${patientId}`);
        const p = patientRes.patient;
        setPatientName(p.name);
        setPatientCode(p.patient_code);

        if (isEditMode) {
          // 3. Fetch visit details
          const visitRes = await apiFetch(`/visits/${visitId}`);
          const v = visitRes.visit;
          
          setDoctorId(v.doctor_id);
          // Format date to local YYYY-MM-DDTHH:MM for datetime-local input
          const localDate = new Date(v.visit_date);
          // Offset timezone to avoid UTC conversion mismatch in display
          const timezoneOffset = localDate.getTimezoneOffset() * 60000; // in milliseconds
          const localISOTime = new Date(localDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
          setVisitDate(localISOTime);
          
          setChiefComplaint(v.chief_complaint);
          setDiagnosis(v.diagnosis);
          setBloodPressure(v.blood_pressure || '');
          setWeightKg(v.weight_kg ? v.weight_kg.toString() : '');
          setTemperatureF(v.temperature_f ? v.temperature_f.toString() : '');
          setDoctorNotes(v.doctor_notes || '');
          setFollowUpDate(v.follow_up_date ? v.follow_up_date.split('T')[0] : '');
        } else {
          // Default: set assigned doctor from patient file and current datetime
          setDoctorId(p.assigned_doctor_id);
          
          const now = new Date();
          const timezoneOffset = now.getTimezoneOffset() * 60000;
          const localNowISO = new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
          setVisitDate(localNowISO);

          if (user?.role === 'Receptionist') {
            setDiagnosis('Pending Consultation');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize visit form.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId, visitId, isEditMode, user?.role]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!doctorId || !chiefComplaint.trim() || !diagnosis.trim()) {
      setError('Doctor, Chief Complaint, and Diagnosis are required fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      if (isEditMode) {
        // Edit Visit PUT
        await apiFetch(`/visits/${visitId}`, {
          method: 'PUT',
          body: JSON.stringify({
            doctorId,
            visitDate,
            chiefComplaint,
            diagnosis,
            bloodPressure: bloodPressure || undefined,
            weightKg: weightKg || undefined,
            temperatureF: temperatureF || undefined,
            doctorNotes: doctorNotes || undefined,
            followUpDate: followUpDate || undefined,
          })
        });

        setSuccess('Visit record updated successfully.');
        setTimeout(() => navigate(`/patients/${patientId}`), 1500);
      } else {
        // Add Visit POST
        await apiFetch(`/patients/${patientId}/visits`, {
          method: 'POST',
          body: JSON.stringify({
            doctorId,
            visitDate,
            chiefComplaint,
            diagnosis,
            bloodPressure: bloodPressure || undefined,
            weightKg: weightKg || undefined,
            temperatureF: temperatureF || undefined,
            doctorNotes: doctorNotes || undefined,
            followUpDate: followUpDate || undefined,
          })
        });

        setSuccess('Visit recorded successfully.');
        setTimeout(() => navigate(`/patients/${patientId}`), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save visit record.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading details...</span>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={`/patients/${patientId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {patientCode} - {patientName}
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
          {isEditMode ? 'Modify Visit Record' : 'Record Clinical Visit'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          {isEditMode ? 'Edit consultation details, diagnoses, and follow-up directives' : 'Log vitals, patient symptoms, and physician notes for the active consultation'}
        </p>
      </div>

      {/* Banners */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Core Consultation Panel */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          
          <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', fontWeight: 600, color: 'white', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Consultation Particulars</span>
          </h3>

          <div className="form-group">
            <label className="form-label">Consultant Doctor *</label>
            <select
              className="form-select"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
            >
              <option value="" disabled>Select consultant</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Visit Date & Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Chief Complaint / Symptoms *</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '90px', resize: 'vertical' }}
              placeholder="Record chief complaints or symptoms described by the patient..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Clinical Diagnosis *</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '90px', resize: 'vertical' }}
              placeholder="Record primary clinical diagnosis..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              disabled={user?.role === 'Receptionist'}
            />
          </div>

        </div>

        {/* Vitals Info Panel */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          
          <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', fontWeight: 600, color: 'white', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HeartPulse size={18} style={{ color: 'var(--color-danger)' }} />
            <span>Patient Vitals (Optional)</span>
          </h3>

          <div className="form-group">
            <label className="form-label">Blood Pressure (mmHg)</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. 120/80"
              value={bloodPressure}
              onChange={(e) => setBloodPressure(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. 70.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temperature (°F)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. 98.6"
              value={temperatureF}
              onChange={(e) => setTemperatureF(e.target.value)}
            />
          </div>

        </div>

        {/* Doctor Notes & Directives Panel */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          
          <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', fontWeight: 600, color: 'white', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Clinical Notes & Directives
          </h3>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Detailed Doctor Notes (Optional)</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '100px', resize: 'vertical' }}
              placeholder="Enter prescription details, treatment plans, or remarks..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              disabled={user?.role === 'Receptionist'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Follow-up Appointment Date (Optional)</label>
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              disabled={user?.role === 'Receptionist'}
            />
          </div>

        </div>

        {/* Form Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <Link to={`/patients/${patientId}`} className="btn-secondary">
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: 'auto', padding: '0 2rem' }}
            disabled={submitLoading}
          >
            {submitLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving details...</span>
              </>
            ) : (
              <span>{isEditMode ? 'Update Visit' : 'Record Visit'}</span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
export default VisitForm;
