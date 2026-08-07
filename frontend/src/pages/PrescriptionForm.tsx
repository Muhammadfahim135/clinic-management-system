import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  AlertCircle,
  FileText,
  Activity
} from 'lucide-react';

interface MedicineItemInput {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
}

export const PrescriptionForm = () => {
  const { id: patientId, visitId, prescriptionId } = useParams<{ id: string; visitId: string; prescriptionId?: string }>();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const isEditMode = !!prescriptionId;

  // Patient / Visit header states
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [visitDiagnosis, setVisitDiagnosis] = useState('');

  // Form states
  const [instructions, setInstructions] = useState('');
  const [medicines, setMedicines] = useState<MedicineItemInput[]>([
    { medicineName: '', dosage: '', frequency: 'Twice Daily', duration: '5 Days', notes: '' }
  ]);

  // Loading/Error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial details
  useEffect(() => {
    const fetchContextData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch visit details to populate header information
        const visitData = await apiFetch(`/visits/${visitId}`);
        setPatientName(visitData.visit.patient_name);
        setPatientCode(visitData.visit.patient_code);
        setVisitDiagnosis(visitData.visit.diagnosis);

        // 2. If in Edit Mode, fetch existing prescription data
        if (isEditMode) {
          const presData = await apiFetch(`/prescriptions/${prescriptionId}`);
          setInstructions(presData.prescription.instructions || '');
          
          // Map backend items to input structure
          const mappedItems = presData.prescription.items.map((item: any) => ({
            medicineName: item.medicine_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            notes: item.notes || '',
          }));
          setMedicines(mappedItems);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load contextual data.');
      } finally {
        setLoading(false);
      }
    };

    fetchContextData();
  }, [visitId, prescriptionId, isEditMode]);

  // Handle dynamic row modification
  const handleAddRow = () => {
    setMedicines([
      ...medicines,
      { medicineName: '', dosage: '', frequency: 'Twice Daily', duration: '5 Days', notes: '' }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (medicines.length === 1) {
      alert('A prescription must contain at least one medicine item.');
      return;
    }
    const updated = [...medicines];
    updated.splice(index, 1);
    setMedicines(updated);
  };

  const handleItemChange = (index: number, field: keyof MedicineItemInput, value: string) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Front-end validations
    if (medicines.length === 0) {
      setError('At least one medicine is required.');
      setSaving(false);
      return;
    }

    for (let i = 0; i < medicines.length; i++) {
      const med = medicines[i];
      if (!med.medicineName.trim()) {
        setError(`Medicine Row #${i + 1}: Name cannot be empty.`);
        setSaving(false);
        return;
      }
      if (!med.dosage.trim()) {
        setError(`Medicine Row #${i + 1}: Dosage is required.`);
        setSaving(false);
        return;
      }
      if (!med.frequency.trim()) {
        setError(`Medicine Row #${i + 1}: Frequency is required.`);
        setSaving(false);
        return;
      }
      if (!med.duration.trim()) {
        setError(`Medicine Row #${i + 1}: Duration is required.`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        visitId,
        instructions: instructions.trim(),
        items: medicines,
      };

      let result;
      if (isEditMode) {
        result = await apiFetch(`/prescriptions/${prescriptionId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        result = await apiFetch('/prescriptions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (result.success) {
        navigate(`/patients/${patientId}/visits/${visitId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate(`/patients/${patientId}/visits/${visitId}`)} 
          className="btn-secondary" 
          style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Visit</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEditMode ? 'Modify Clinical Prescription' : 'Write Patient Prescription'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isEditMode ? 'Edit instructions and dosages for registered visit' : 'Compile medications and dosing timelines for the current consult'}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading consult file information...</span>
        </div>
      ) : error && !patientName ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Context Record Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
          <Link to={`/patients/${patientId}`} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Patient Profile
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Patient context header card */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-role-doctor)' }}>
                <Activity size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>PRESCRIPTION CONTEXT</span>
                <h4 style={{ fontWeight: 600, color: 'white', fontSize: '1rem', marginTop: '0.1rem' }}>
                  {patientName} ({patientCode})
                </h4>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>VISIT DIAGNOSIS</span>
              <p style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.1rem' }}>{visitDiagnosis}</p>
            </div>
          </div>

          {/* Medicines dynamic table builder */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Medicine Items</span>
              </h3>
              <button 
                type="button" 
                className="btn-action" 
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                onClick={handleAddRow}
                disabled={saving}
              >
                <Plus size={14} />
                <span>Add Medicine</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {medicines.map((med, index) => (
                <div 
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 2fr auto',
                    gap: '0.75rem',
                    alignItems: 'end',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--glass-border)',
                    padding: '1rem',
                    borderRadius: '6px'
                  }}
                >
                  {/* Medicine Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Medicine Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. Paracetamol"
                      value={med.medicineName}
                      onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Dosage */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Dosage *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. 500 mg"
                      value={med.dosage}
                      onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Frequency */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Frequency *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. Twice Daily"
                      value={med.frequency}
                      onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Duration */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Duration *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. 5 Days"
                      value={med.duration}
                      onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Additional Instructions (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. Take after meals"
                      value={med.notes}
                      onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  {/* Delete row button */}
                  <button 
                    type="button" 
                    className="btn-icon delete" 
                    style={{ height: '32px', width: '32px', marginBottom: '2px' }}
                    onClick={() => handleRemoveRow(index)}
                    disabled={saving || medicines.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions card */}
          <div className="glass-card">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span>General Instructions & Diet Details (Optional)</span>
              </label>
              <textarea
                className="form-input"
                style={{ padding: '0.75rem', height: '110px', resize: 'vertical' }}
                placeholder="Enter general prescription advice, diet plans, diagnostic tests to undergo, or next checkup requests..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Error and saving indicators */}
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => navigate(`/patients/${patientId}/visits/${visitId}`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{isEditMode ? 'Update Prescription' : 'Save Prescription'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
export default PrescriptionForm;
