import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Check, 
  Loader2,
  FileUser
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  email: string;
  department_id?: string | null;
  department_name?: string | null;
}

interface ContactField {
  id?: string; // present on existing contacts in edit mode
  contactNumber: string;
  contactType: 'Primary' | 'Secondary' | 'Guardian' | 'Emergency';
  isPrimary: boolean;
}

export const PatientForm = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Quick Add Doctor modal states
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocEmail, setNewDocEmail] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('DoctorPass123!');
  const [newDocDeptId, setNewDocDeptId] = useState('');
  const [addDocLoading, setAddDocLoading] = useState(false);
  const [addDocError, setAddDocError] = useState<string | null>(null);

  // Auto-prefill department inside doctor modal if already selected in filter
  useEffect(() => {
    if (showAddDocModal && selectedDeptId) {
      setNewDocDeptId(selectedDeptId);
    }
  }, [showAddDocModal, selectedDeptId]);
  
  // Dynamic Contacts
  const [contacts, setContacts] = useState<ContactField[]>([
    { contactNumber: '', contactType: 'Primary', isPrimary: true }
  ]);

  // Load doctors and patient (if editing)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch active doctors list (accessible to Receptionist/Doctor roles)
        const docRes = await apiFetch('/users/doctors');
        setDoctors(docRes.doctors || []);

        if (isEditMode) {
          // Fetch existing patient info
          const patientData = await apiFetch(`/patients/${id}`);
          const p = patientData.patient;
          
          setName(p.name);
          setFatherName(p.father_name);
          setGender(p.gender);
          // Format date to YYYY-MM-DD for date input
          setDob(p.date_of_birth.split('T')[0]);
          setAge(p.age.toString());
          setCnic(p.cnic);
          setAddress(p.address);
          setBloodGroup(p.blood_group || '');
          setAllergies(p.allergies || '');
          setMedicalHistory(p.medical_history || '');
          setAssignedDoctorId(p.assigned_doctor_id);
          setConsentGiven(p.consent_given || false);
          
          // Map existing contacts
          if (p.contacts && p.contacts.length > 0) {
            setContacts(p.contacts.map((c: any) => ({
              id: c.id,
              contactNumber: c.contact_number,
              contactType: c.contact_type,
              isPrimary: c.is_primary
            })));
          }

          // Set active department from assigned doctor profile
          const matchedDoc = docRes.doctors.find((d: any) => d.id === p.assigned_doctor_id);
          if (matchedDoc && matchedDoc.department_id) {
            setSelectedDeptId(matchedDoc.department_id);
          }
        } else {
          // Prefill default doctor if list is not empty
          if (docRes.doctors.length > 0) {
            setAssignedDoctorId(docRes.doctors[0].id);
            if (docRes.doctors[0].department_id) {
              setSelectedDeptId(docRes.doctors[0].department_id);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize patient form.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  // Handler for Date of Birth changes (auto-calculates age)
  const handleDobChange = (dobValue: string) => {
    setDob(dobValue);
    if (dobValue) {
      const birthDate = new Date(dobValue);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      // If birth date has not occurred yet this year, subtract one year
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(Math.max(0, calculatedAge).toString());
    }
  };

  // Quick Add Doctor submit handler
  const handleQuickAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddDocError(null);

    if (!newDocName.trim() || !newDocEmail.trim() || !newDocPassword.trim()) {
      setAddDocError('Please fill in all required fields.');
      return;
    }

    setAddDocLoading(true);
    try {
      const result = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newDocName.trim(),
          email: newDocEmail.toLowerCase().trim(),
          password: newDocPassword,
          roleName: 'Doctor',
          departmentId: newDocDeptId || null
        })
      });

      if (result.success) {
        const newDoctor: Doctor = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          department_id: result.user.department_id
        };

        // Update list & select newly created doctor
        setDoctors(prev => [...prev, newDoctor]);
        setAssignedDoctorId(newDoctor.id);

        if (newDoctor.department_id) {
          setSelectedDeptId(newDoctor.department_id);
        }

        // Reset state & close modal
        setNewDocName('');
        setNewDocEmail('');
        setNewDocPassword('DoctorPass123!');
        setNewDocDeptId('');
        setShowAddDocModal(false);
      }
    } catch (err: any) {
      setAddDocError(err.message || 'Failed to register new doctor.');
    } finally {
      setAddDocLoading(false);
    }
  };

  // Contacts Handlers
  const addContactRow = () => {
    setContacts([
      ...contacts,
      { contactNumber: '', contactType: 'Secondary', isPrimary: false }
    ]);
  };

  const removeContactRow = (index: number) => {
    // If we're editing contacts dynamically, the backend will validate.
    // In React state, we prevent removing the last contact
    if (contacts.length <= 1) {
      setError('A patient must have at least one contact number.');
      return;
    }

    const rowToDelete = contacts[index];
    const newContacts = contacts.filter((_, i) => i !== index);

    // If we delete the primary contact, auto-assign primary status to the first available contact
    if (rowToDelete.isPrimary) {
      newContacts[0].isPrimary = true;
    }

    setContacts(newContacts);
  };

  const handleContactChange = (index: number, field: keyof ContactField, value: any) => {
    const newContacts = contacts.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: value };
    });
    setContacts(newContacts);
  };

  const handleSelectPrimary = (index: number) => {
    const newContacts = contacts.map((c, i) => ({
      ...c,
      isPrimary: i === index
    }));
    setContacts(newContacts);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Form validation checks
    if (!name.trim() || !fatherName.trim() || !dob || !age || !cnic.trim() || !address.trim() || !assignedDoctorId) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!consentGiven) {
      setError('Explicit patient data processing consent is required under GDPR & HIPAA guidelines.');
      return;
    }

    // Ensure all contacts have numbers
    const invalidContacts = contacts.some(c => !c.contactNumber.trim());
    if (invalidContacts) {
      setError('Please fill in all contact numbers or remove empty rows.');
      return;
    }

    // Ensure exactly one primary contact is designated
    const primaryCount = contacts.filter(c => c.isPrimary).length;
    if (primaryCount !== 1) {
      setError('Please select exactly one contact number as Primary.');
      return;
    }

    setSubmitLoading(true);

    try {
      if (isEditMode) {
        // Edit Patient
        await apiFetch(`/patients/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            fatherName,
            gender,
            dateOfBirth: dob,
            age,
            cnic,
            address,
            bloodGroup: bloodGroup || undefined,
            allergies: allergies || undefined,
            medicalHistory: medicalHistory || undefined,
            assignedDoctorId,
            consentGiven,
          })
        });

        setSuccess('Patient details updated successfully.');
        setTimeout(() => navigate(`/patients/${id}`), 1500);
      } else {
        // Register Patient (registers patient + contacts in one transaction)
        const result = await apiFetch('/patients', {
          method: 'POST',
          body: JSON.stringify({
            name,
            fatherName,
            gender,
            dateOfBirth: dob,
            age,
            cnic,
            address,
            bloodGroup: bloodGroup || undefined,
            allergies: allergies || undefined,
            medicalHistory: medicalHistory || undefined,
            assignedDoctorId,
            consentGiven,
            contacts: contacts.map(c => ({
              contactNumber: c.contactNumber,
              contactType: c.contactType,
              isPrimary: c.isPrimary
            }))
          })
        });

        setSuccess('Patient registered successfully.');
        setTimeout(() => navigate(`/patients/${result.patient.id}`), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving patient records.');
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
        <Link to={isEditMode ? `/patients/${id}` : '/patients'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to {isEditMode ? 'Patient Profile' : 'Patient List'}</span>
        </Link>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEditMode ? 'Modify Patient Profile' : 'Register New Patient'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          {isEditMode ? 'Update demographic info and assignment parameters' : 'Create a new patient file in the medical records registry'}
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

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Core demographic card */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          
          <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', fontWeight: 600, color: 'white', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileUser size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Demographic Information</span>
          </h3>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. Alice Cooper"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Father's Name *</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. Robert Cooper"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">CNIC * (Format: 12345-1234567-1)</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="37405-1234567-1"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gender *</label>
            <select
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date of Birth *</label>
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              value={dob}
              onChange={(e) => handleDobChange(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Age *</label>
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="e.g. 35"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Permanent / Current Address *</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '80px', resize: 'vertical' }}
              placeholder="Complete residential address details..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

        </div>

        {/* Clinical particulars card */}
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          
          <h3 style={{ gridColumn: '1 / -1', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            Clinical Assignment & Particulars
          </h3>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Assigned Doctor *</label>
              <button
                type="button"
                onClick={() => setShowAddDocModal(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  padding: 0
                }}
              >
                <Plus size={14} />
                <span>Add Doctor</span>
              </button>
            </div>
            <select
              className="form-select"
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
              required
            >
              <option value="" disabled>Select assigned doctor</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Blood Group (Optional)</label>
            <select
              className="form-select"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
            >
              <option value="">Unknown</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Known Allergies (Optional)</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '60px', resize: 'none' }}
              placeholder="List drug, environmental, food allergies (if any)..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Medical History / Notes (Optional)</label>
            <textarea
              className="form-input"
              style={{ paddingLeft: '1rem', height: '60px', resize: 'none' }}
              placeholder="Chronic conditions, surgical history, family history notes..."
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
            />
          </div>

        </div>

        {/* Contacts section (Only render during Patient Registration. In Edit Mode, contacts are handled inside Profile page to follow best practice, or we can disable contacts list editing here) */}
        {!isEditMode && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
                Contact Numbers *
              </h3>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                onClick={addContactRow}
              >
                <Plus size={14} />
                <span>Add Number</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contacts.map((c, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  
                  <div className="form-group" style={{ flexGrow: 2, minWidth: '180px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Contact Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      placeholder="e.g. +92 300 1234567"
                      value={c.contactNumber}
                      onChange={(e) => handleContactChange(index, 'contactNumber', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ flexGrow: 1, minWidth: '120px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Type *</label>
                    <select
                      className="form-select"
                      style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                      value={c.contactType}
                      onChange={(e) => handleContactChange(index, 'contactType', e.target.value)}
                      required
                    >
                      <option value="Primary">Primary</option>
                      <option value="Secondary">Secondary</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', height: '38px', gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="primaryContactRadio"
                      checked={c.isPrimary}
                      onChange={() => handleSelectPrimary(index)}
                      id={`primaryRadio_${index}`}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor={`primaryRadio_${index}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Primary</label>
                  </div>

                  <button
                    type="button"
                    className="btn-icon delete"
                    style={{ height: '38px', width: '38px', borderRadius: 'var(--border-radius-sm)' }}
                    onClick={() => removeContactRow(index)}
                    disabled={contacts.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* HIPAA & GDPR compliance consent checkbox card */}
        <div className="glass-card" style={{ padding: '1.25rem', border: consentGiven ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed rgba(239, 68, 68, 0.3)', background: consentGiven ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)', borderRadius: 'var(--border-radius-sm)', transition: 'all 0.3s ease', marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input 
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '0.15rem', accentColor: 'var(--color-primary)' }}
            />
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white', display: 'block' }}>
                HIPAA & GDPR Data Compliance Consent *
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block', lineHeight: '1.4' }}>
                Patient consents to secure storage and processing of their Protected Health Information (PHI) and CNIC details under HIPAA guidelines (for clinical documentation) and GDPR requirements (Article 6/9 data storage consent).
              </span>
            </div>
          </label>
        </div>

        {/* Action Button footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <Link to={isEditMode ? `/patients/${id}` : '/patients'} className="btn-secondary">
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
                <span>Saving file...</span>
              </>
            ) : (
              <span>{isEditMode ? 'Save Changes' : 'Register Patient'}</span>
            )}
          </button>
        </div>

      </form>

      {/* QUICK ADD DOCTOR MODAL */}
      {showAddDocModal && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Register New Doctor
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowAddDocModal(false);
                  setAddDocError(null);
                }} 
                className="modal-close" 
                disabled={addDocLoading}
                style={{ background: 'transparent' }}
              >
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            {addDocError && (
              <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={16} />
                <span>{addDocError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddDoctor}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. Dr. Emily Taylor"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    required
                    disabled={addDocLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. doctor.new@clinic.com"
                    value={newDocEmail}
                    onChange={(e) => setNewDocEmail(e.target.value)}
                    required
                    disabled={addDocLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="DoctorPass123!"
                    value={newDocPassword}
                    onChange={(e) => setNewDocPassword(e.target.value)}
                    required
                    disabled={addDocLoading}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddDocModal(false);
                    setAddDocError(null);
                  }}
                  disabled={addDocLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0 1.5rem' }}
                  disabled={addDocLoading}
                >
                  {addDocLoading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Doctor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PatientForm;
