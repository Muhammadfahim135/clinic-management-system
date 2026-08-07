import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Edit, 
  Phone, 
  Activity, 
  User, 
  Heart, 
  FileText, 
  AlertTriangle,
  Plus,
  X,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ImageUpload } from '../components/ImageUpload';

interface Contact {
  id: string;
  contact_number: string;
  contact_type: 'Primary' | 'Secondary' | 'Guardian' | 'Emergency';
  is_primary: boolean;
}

interface Patient {
  id: string;
  patient_code: string;
  name: string;
  father_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  cnic: string;
  address: string;
  blood_group: string | null;
  allergies: string | null;
  medical_history: string | null;
  assigned_doctor_id: string;
  doctor_name: string;
  created_at: string;
  contacts: Contact[];
}

interface TimelineEvent {
  visitNumber: number;
  id: string;
  visitDate: string;
  doctorName: string;
  chiefComplaint: string;
  diagnosis: string;
  followUpDate: string | null;
  doctorNotes: string | null;
  bloodPressure: string | null;
  weightKg: number | null;
  temperatureF: number | null;
}

export const PatientProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'Admin' || user?.role === 'Receptionist';

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeletePatient = async () => {
    if (!patient) return;
    if (!window.confirm(`Are you sure you want to permanently delete the patient file for ${patient.name}? This action cannot be undone, though clinical history will be archived.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const data = await apiFetch(`/patients/${id}`, {
        method: 'DELETE'
      });
      if (data.success) {
        alert(data.message || 'Patient record deleted successfully.');
        navigate('/patients');
      } else {
        triggerBanner('error', data.message || 'Failed to delete patient record.');
      }
    } catch (err: any) {
      triggerBanner('error', err.message || 'An error occurred while deleting the patient record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Timeline State
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  // Gallery Tab State
  const [activeTab, setActiveTab] = useState<'timeline' | 'gallery' | 'prescriptions' | 'billing'>('timeline');
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);

  // Billing State
  const [bills, setBills] = useState<any[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);

  // Add Contact Form State
  const [showAddContact, setShowAddContact] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newType, setNewType] = useState<'Primary' | 'Secondary' | 'Guardian' | 'Emergency'>('Secondary');
  const [newIsPrimary, setNewIsPrimary] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Edit Contact Form State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editType, setEditType] = useState<'Primary' | 'Secondary' | 'Guardian' | 'Emergency'>('Secondary');
  const [editIsPrimary, setEditIsPrimary] = useState(false);

  const fetchPatientDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/patients/${id}`);
      setPatient(data.patient);

      // Fetch patient timeline
      setTimelineLoading(true);
      const timelineData = await apiFetch(`/patients/${id}/timeline`);
      setTimeline(timelineData.timeline);

      // Fetch patient gallery images
      setGalleryLoading(true);
      const galleryData = await apiFetch(`/patients/${id}/images`);
      setGalleryImages(galleryData.images);

      // Fetch patient prescriptions
      setPrescriptionsLoading(true);
      const prescriptionsData = await apiFetch(`/prescriptions/patient/${id}`);
      setPrescriptions(prescriptionsData.prescriptions);

      // Fetch patient bills
      setBillsLoading(true);
      const billsData = await apiFetch(`/bills/patient/${id}`);
      setBills(billsData.bills);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve patient details.');
    } finally {
      setLoading(false);
      setTimelineLoading(false);
      setGalleryLoading(false);
      setPrescriptionsLoading(false);
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const triggerBanner = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Add contact submit
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;

    setContactLoading(true);
    try {
      const result = await apiFetch(`/patients/${id}/contacts`, {
        method: 'POST',
        body: JSON.stringify({
          contactNumber: newNumber,
          contactType: newType,
          isPrimary: newIsPrimary
        })
      });

      if (result.success) {
        triggerBanner('success', 'Contact number added successfully.');
        setShowAddContact(false);
        setNewNumber('');
        setNewType('Secondary');
        setNewIsPrimary(false);
        // Refresh details
        fetchPatientDetails();
      }
    } catch (err: any) {
      triggerBanner('error', err.message || 'Failed to add contact number.');
    } finally {
      setContactLoading(false);
    }
  };

  // Start editing contact
  const startEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setEditNumber(c.contact_number);
    setEditType(c.contact_type);
    setEditIsPrimary(c.is_primary);
  };

  // Save edited contact
  const handleEditContactSubmit = async (contactId: string) => {
    if (!editNumber.trim()) return;

    setContactLoading(true);
    try {
      const result = await apiFetch(`/patients/${id}/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify({
          contactNumber: editNumber,
          contactType: editType,
          isPrimary: editIsPrimary
        })
      });

      if (result.success) {
        triggerBanner('success', 'Contact number updated.');
        setEditingContactId(null);
        fetchPatientDetails();
      }
    } catch (err: any) {
      triggerBanner('error', err.message || 'Failed to update contact number.');
    } finally {
      setContactLoading(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId: string) => {
    if (!patient) return;
    if (patient.contacts.length <= 1) {
      triggerBanner('error', 'Cannot delete contact. Patient must have at least one contact number.');
      return;
    }

    if (!window.confirm('Delete this contact number?')) return;

    setContactLoading(true);
    try {
      const result = await apiFetch(`/patients/${id}/contacts/${contactId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        triggerBanner('success', 'Contact number deleted.');
        fetchPatientDetails();
      }
    } catch (err: any) {
      triggerBanner('error', err.message || 'Failed to delete contact.');
    } finally {
      setContactLoading(false);
    }
  };

  if (loading && !patient) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Fetching clinical profile...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Patient Profile Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          The requested patient record could not be located in the database registry.
        </p>
        <Link to="/patients" className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
          Back to Registry
        </Link>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to="/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to Patient List</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isStaff && (
            <Link to={`/patients/edit/${patient.id}`} className="btn-action">
              <Edit size={16} />
              <span>Edit Profile</span>
            </Link>
          )}
          {user?.role === 'Admin' && (
            <button
              type="button"
              className="btn-action"
              style={{
                background: 'linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={handleDeletePatient}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Trash2 size={16} />
              )}
              <span>Delete Patient File</span>
            </button>
          )}
        </div>
      </div>

      {/* Message banners */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Grid Profile Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Patient Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Info Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {patient.patient_code}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>
                  {patient.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Father's Name: <strong>{patient.father_name}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered On</span>
                <div style={{ fontWeight: 500, fontSize: '0.95rem', color: 'white' }}>
                  {new Date(patient.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gender</span>
                <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem', textTransform: 'capitalize' }}>{patient.gender}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Age</span>
                <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>{patient.age} Years</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date of Birth</span>
                <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>{new Date(patient.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CNIC</span>
                <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>{patient.cnic}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Blood Group</span>
                <p style={{ fontWeight: 600, color: patient.blood_group ? '#10b981' : 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {patient.blood_group || 'Not Specified'}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Residential Address</span>
              <p style={{ color: 'white', marginTop: '0.25rem', fontSize: '0.95rem', lineHeight: '1.5' }}>{patient.address}</p>
            </div>
          </div>

          {/* Medical Details Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Heart size={18} style={{ color: 'var(--color-danger)' }} />
              <span>Medical Summary</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={14} />
                  <span>Known Allergies</span>
                </span>
                <p style={{ color: patient.allergies ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed rgba(239, 68, 68, 0.15)' }}>
                  {patient.allergies || 'No known allergies reported.'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <FileText size={14} />
                  <span>Medical History / Notes</span>
                </span>
                <p style={{ color: patient.medical_history ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                  {patient.medical_history || 'No recorded past medical history.'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs Container Card */}
          <div className="glass-card">
            {/* Tabs Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className={activeTab === 'timeline' ? 'btn-action' : 'btn-secondary'}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => setActiveTab('timeline')}
                >
                  Visit History
                </button>
                <button 
                  type="button"
                  className={activeTab === 'gallery' ? 'btn-action' : 'btn-secondary'}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => setActiveTab('gallery')}
                >
                  Documents & Gallery
                </button>
                <button 
                  type="button"
                  className={activeTab === 'prescriptions' ? 'btn-action' : 'btn-secondary'}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => setActiveTab('prescriptions')}
                >
                  Prescriptions
                </button>
                <button 
                  type="button"
                  className={activeTab === 'billing' ? 'btn-action' : 'btn-secondary'}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  onClick={() => setActiveTab('billing')}
                >
                  Billing
                </button>
              </div>
              
              <Link 
                to={`/patients/${id}/visits/add`}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Plus size={14} />
                <span>Record New Visit</span>
              </Link>
            </div>

            {/* TAB 1: Clinical Timeline */}
            {activeTab === 'timeline' && (
              timelineLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Loading timeline...</span>
                </div>
              ) : timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>No medical visits recorded for this patient.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click "Record New Visit" to log the initial clinical consultation.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingLeft: '1.25rem', borderLeft: '2px solid rgba(255, 255, 255, 0.05)' }}>
                  {timeline.map((event) => (
                    <div key={event.id} style={{ position: 'relative' }}>
                      <div style={{ 
                        position: 'absolute', 
                        left: '-1.65rem', 
                        top: '0.2rem', 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        background: 'var(--color-primary)',
                        boxShadow: '0 0 8px var(--color-primary)',
                        border: '2px solid var(--bg-secondary)'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            Visit #{event.visitNumber}
                          </span>
                          <h4 style={{ fontWeight: 600, color: 'white', fontSize: '1rem', marginTop: '0.35rem' }}>
                            {event.diagnosis}
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Attending: <strong>{event.doctorName}</strong> on {new Date(event.visitDate).toLocaleString()}
                          </p>
                        </div>
                        <Link 
                          to={`/patients/${id}/visits/${event.id}`}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          View Details
                        </Link>
                      </div>

                      <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.01)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <strong>Symptoms:</strong> {event.chiefComplaint}
                      </div>

                      {(event.bloodPressure || event.weightKg || event.temperatureF) && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          {event.bloodPressure && (
                            <span style={{ fontSize: '0.7rem', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)', fontWeight: 500 }}>
                              BP: {event.bloodPressure}
                            </span>
                          )}
                          {event.weightKg && (
                            <span style={{ fontSize: '0.7rem', color: '#a7f3d0', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.15)', fontWeight: 500 }}>
                              Weight: {event.weightKg} kg
                            </span>
                          )}
                          {event.temperatureF && (
                            <span style={{ fontSize: '0.7rem', color: '#fde047', background: 'rgba(253, 224, 71, 0.07)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(253, 224, 71, 0.15)', fontWeight: 500 }}>
                              Temp: {event.temperatureF} °F
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* TAB 2: Images & Progress Gallery */}
            {activeTab === 'gallery' && (
              <div>
                {/* Image Upload Card - Doctor and Admin roles only */}
                {(user?.role === 'Admin' || user?.role === 'Doctor') && (
                  <ImageUpload patientId={id} onUploadSuccess={fetchPatientDetails} />
                )}

                {galleryLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Loading progress gallery...</span>
                  </div>
                ) : galleryImages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <p>No documents or medical scans recorded for this patient.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Use the file upload card above to attach images or reports.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    
                    {/* General Documents (without visit context) */}
                    {galleryImages.some(img => !img.visit_id) && (
                      <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            General Document
                          </span>
                          <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginTop: '0.3rem' }}>
                            Direct Uploads & General Medical History
                          </h4>
                        </div>

                        {/* Thumbnails grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                          {galleryImages.filter(img => !img.visit_id).map((img) => (
                            <div 
                              key={img.id}
                              onClick={() => setSelectedImage({
                                ...img,
                                created_at: img.created_at,
                                uploader_name: img.uploader_name
                              })}
                              style={{ 
                                position: 'relative', 
                                aspectRatio: '1', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                border: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              {img.file_name.toLowerCase().endsWith('.pdf') ? (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                                  <FileText size={32} />
                                  <span style={{ fontSize: '0.55rem', marginTop: '0.2rem', textTransform: 'uppercase', fontWeight: 'bold' }}>PDF Report</span>
                                </div>
                              ) : (
                                <img 
                                  src={`http://localhost:5000/api/images/serve/${img.id}`} 
                                  alt={img.file_name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )}
                              <div style={{ 
                                position: 'absolute', 
                                bottom: 0, 
                                left: 0, 
                                right: 0, 
                                background: 'rgba(0,0,0,0.75)', 
                                color: 'white', 
                                fontSize: '0.65rem', 
                                padding: '2px 4px', 
                                textAlign: 'center',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden'
                              }}>
                                {img.image_type}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visit-level documents */}
                    {timeline.map((visit) => {
                      const visitImages = galleryImages.filter(img => img.visit_id === visit.id);
                      if (visitImages.length === 0) return null; // Only show visits with images for clean progress view

                      return (
                        <div key={visit.id} style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.25rem' }}>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-role-doctor)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              Visit #{visit.visitNumber}
                            </span>
                            <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginTop: '0.3rem' }}>
                              {visit.diagnosis}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Consulted on {new Date(visit.visitDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Thumbnails grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                            {visitImages.map((img) => (
                              <div 
                                key={img.id}
                                onClick={() => setSelectedImage({
                                  ...img,
                                  created_at: img.created_at,
                                  uploader_name: img.uploader_name
                                })}
                                style={{ 
                                  position: 'relative', 
                                  aspectRatio: '1', 
                                  borderRadius: '8px', 
                                  overflow: 'hidden', 
                                  border: '1px solid var(--glass-border)',
                                  cursor: 'pointer',
                                  transition: 'var(--transition-smooth)'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'scale(1)'; }}
                              >
                                {img.file_name.toLowerCase().endsWith('.pdf') ? (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                                    <FileText size={32} />
                                    <span style={{ fontSize: '0.55rem', marginTop: '0.2rem', textTransform: 'uppercase', fontWeight: 'bold' }}>PDF Report</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={`http://localhost:5000/api/images/serve/${img.id}`} 
                                    alt={img.file_name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                )}
                                <div style={{ 
                                  position: 'absolute', 
                                  bottom: 0, 
                                  left: 0, 
                                  right: 0, 
                                  background: 'rgba(0,0,0,0.75)', 
                                  color: 'white', 
                                  fontSize: '0.65rem', 
                                  padding: '2px 4px', 
                                  textAlign: 'center',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden'
                                }}>
                                  {img.image_type}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Prescriptions */}
            {activeTab === 'prescriptions' && (
              prescriptionsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Loading prescriptions history...</span>
                </div>
              ) : prescriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>No prescriptions logged for this patient.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Prescriptions are created inside the specific visit consultation record.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {prescriptions.map((pres) => (
                    <div 
                      key={pres.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '1.25rem', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            Prescribed on {new Date(pres.prescribed_at).toLocaleDateString()}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            by Dr. {pres.doctor_name}
                          </span>
                        </div>
                        <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                          Diagnosis: {pres.diagnosis}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          <strong>Medications:</strong> {pres.medicines_summary}
                        </p>
                      </div>
                      <div>
                        <Link 
                          to={`/patients/${id}/prescriptions/${pres.id}`}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <span>View Details & Print</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* TAB 4: Billing & Payments */}
            {activeTab === 'billing' && (
              billsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Loading billing registry...</span>
                </div>
              ) : bills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>No billing invoices recorded for this patient.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Billing invoices are generated inside the specific visit details sheet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {bills.map((bill) => {
                    let statusColor = 'var(--text-muted)';
                    let statusBg = 'rgba(255,255,255,0.05)';
                    
                    if (bill.payment_status === 'Paid') {
                      statusColor = '#a7f3d0';
                      statusBg = 'rgba(16, 185, 129, 0.1)';
                    } else if (bill.payment_status === 'Partially Paid') {
                      statusColor = '#fed7aa';
                      statusBg = 'rgba(249, 115, 22, 0.1)';
                    } else if (bill.payment_status === 'Unpaid') {
                      statusColor = '#fca5a5';
                      statusBg = 'rgba(239, 68, 68, 0.1)';
                    }

                    return (
                      <div 
                        key={bill.id} 
                        className="glass-card" 
                        style={{ 
                          padding: '1.25rem', 
                          background: 'rgba(255,255,255,0.01)', 
                          border: '1px solid var(--glass-border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                              {bill.bill_number}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Billed on {new Date(bill.created_at).toLocaleDateString()}
                            </span>
                            <span style={{
                              display: 'inline-block',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              color: statusColor,
                              backgroundColor: statusBg,
                              border: `1px solid ${statusColor}33`
                            }}>
                              {bill.payment_status}
                            </span>
                          </div>
                          <h4 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                            Diagnosis: {bill.diagnosis}
                          </h4>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <span>Total: <strong>{parseFloat(bill.total_amount).toLocaleString()} PKR</strong></span>
                            <span>Remaining: <strong style={{ color: parseFloat(bill.remaining_amount) > 0 ? 'var(--color-danger)' : '#10b981' }}>{parseFloat(bill.remaining_amount).toLocaleString()} PKR</strong></span>
                          </div>
                        </div>
                        <div>
                          <Link 
                            to={`/patients/${id}/bills/${bill.id}`}
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <span>View Details & Payments</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

          </div>

        </div>

        {/* Right Side: Doctor Assignment & Contact Numbers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Assigned Doctor Card */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-role-doctor)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User size={18} style={{ color: 'var(--color-role-doctor)' }} />
              <span>Assigned Doctor</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <Activity size={20} style={{ color: 'var(--color-role-doctor)', margin: 'auto' }} />
              </div>
              <div>
                <h4 style={{ fontWeight: 600, color: 'white' }}>{patient.doctor_name}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consultant Medical Practitioner</p>
              </div>
            </div>
          </div>

          {/* Contact Numbers Manager */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Contact Details</span>
              </h3>
              
              {isStaff && (
                <button 
                  className="btn-icon" 
                  style={{ height: '28px', width: '28px' }}
                  onClick={() => { setShowAddContact(!showAddContact); setEditingContactId(null); }}
                  title="Add Contact"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Add Contact Form */}
            {showAddContact && (
              <form onSubmit={handleAddContactSubmit} className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--card-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Add Contact</span>
                  <button type="button" onClick={() => setShowAddContact(false)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                    <X size={16} />
                  </button>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '0.75rem', fontSize: '0.85rem', padding: '0.5rem' }}
                    placeholder="Phone Number"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    disabled={contactLoading}
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    disabled={contactLoading}
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Emergency">Emergency</option>
                  </select>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newIsPrimary}
                      onChange={(e) => setNewIsPrimary(e.target.checked)}
                      disabled={contactLoading}
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span>Set Primary</span>
                  </label>
                </div>

                <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem', marginTop: '0.5rem' }} disabled={contactLoading || !newNumber.trim()}>
                  {contactLoading ? 'Adding...' : 'Save Contact'}
                </button>
              </form>
            )}

            {/* List of existing contacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {patient.contacts.map((c) => (
                <div key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.75rem' }}>
                  
                  {editingContactId === c.id ? (
                    /* Edit inline panel */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.5rem', borderRadius: '4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.35rem', fontSize: '0.85rem' }}
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        required
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <select
                          className="form-select"
                          style={{ padding: '0.3rem', fontSize: '0.8rem', width: '100px' }}
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as any)}
                        >
                          <option value="Primary">Primary</option>
                          <option value="Secondary">Secondary</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Emergency">Emergency</option>
                        </select>
                        
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <input
                            type="checkbox"
                            checked={editIsPrimary}
                            onChange={(e) => setEditIsPrimary(e.target.checked)}
                          />
                          <span>Primary</span>
                        </label>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                        <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setEditingContactId(null)}>
                          Cancel
                        </button>
                        <button type="button" className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', width: 'auto' }} onClick={() => handleEditContactSubmit(c.id)}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode row */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>{c.contact_number}</span>
                          <span className={`profile-role-badge role-${c.contact_type.toLowerCase() === 'primary' ? 'receptionist' : c.contact_type.toLowerCase() === 'emergency' ? 'admin' : 'doctor'}`} style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                            {c.contact_type}
                          </span>
                          {c.is_primary && (
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#a7f3d0', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                              Primary
                            </span>
                          )}
                        </div>
                      </div>

                      {isStaff && (
                        <div className="action-buttons">
                          <button className="btn-icon edit" style={{ height: '24px', width: '24px' }} onClick={() => startEditContact(c)} title="Edit Contact">
                            <Edit size={12} />
                          </button>
                          <button className="btn-icon delete" style={{ height: '24px', width: '24px' }} onClick={() => handleDeleteContact(c.id)} title="Delete Contact" disabled={c.is_primary && patient.contacts.length > 1}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {selectedImage && (
        <ImagePreviewModal 
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDeleteSuccess={fetchPatientDetails}
          onUpdateSuccess={fetchPatientDetails}
        />
      )}

    </div>
  );
};
export default PatientProfile;
