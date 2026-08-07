import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  HeartPulse, 
  ClipboardCheck, 
  FileText, 
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  Plus,
  CreditCard
} from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface VisitDetail {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  doctor_id: string;
  doctor_name: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  blood_pressure: string | null;
  weight_kg: string | null;
  temperature_f: string | null;
  doctor_notes: string | null;
  follow_up_date: string | null;
}

export const VisitDetails = () => {
  const { id: patientId, visitId } = useParams<{ id: string; visitId: string }>();
  
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  // State
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Visit Images State
  const [images, setImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  // Visit Prescriptions State
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);

  // Visit Bill State
  const [bill, setBill] = useState<any | null>(null);
  const [billLoading, setBillLoading] = useState(true);

  const fetchVisitDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/visits/${visitId}`);
      setVisit(data.visit);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch visit details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitImages = async () => {
    setImagesLoading(true);
    try {
      const data = await apiFetch(`/visits/${visitId}/images`);
      setImages(data.images);
    } catch (err) {
      console.error('Failed to fetch visit images:', err);
    } finally {
      setImagesLoading(false);
    }
  };

  const fetchVisitPrescriptions = async () => {
    setPrescriptionsLoading(true);
    try {
      const data = await apiFetch(`/prescriptions/visit/${visitId}`);
      setPrescriptions(data.prescriptions);
    } catch (err) {
      console.error('Failed to fetch visit prescriptions:', err);
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const fetchVisitBill = async () => {
    setBillLoading(true);
    try {
      const data = await apiFetch(`/bills/visit/${visitId}`);
      setBill(data.bill);
    } catch (err) {
      console.error('Failed to fetch visit bill details:', err);
    } finally {
      setBillLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitDetails();
    fetchVisitImages();
    fetchVisitPrescriptions();
    fetchVisitBill();
  }, [visitId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to soft-delete this visit record? This will hide it from the timeline.')) {
      return;
    }

    setDeleteLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/visits/${visitId}`, {
        method: 'DELETE'
      });
      if (result.success) {
        navigate(`/patients/${patientId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete visit record.');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
        <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading consult file...</span>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Visit Record Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {error || 'The requested clinical consult file could not be located in the database.'}
        </p>
        <Link to={`/patients/${patientId}`} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
          Back to Patient Profile
        </Link>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to={`/patients/${patientId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/patients/${patientId}/visits/${visitId}/edit`} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Edit size={14} />
            <span>Edit Record</span>
          </Link>
          {user?.role === 'Admin' && (
            <button 
              className="btn-primary" 
              style={{ width: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'none' }}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              <Trash2 size={14} />
              <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Side: Symptoms, Diagnosis & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Diagnostic Details Card */}
          <div className="glass-card">
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {visit.patient_code} - {visit.patient_name}
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>
                Clinical Consultation
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                  Chief Complaint / Symptoms
                </h4>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                  {visit.chief_complaint}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                  Clinical Diagnosis
                </h4>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.6', background: 'rgba(14, 165, 233, 0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
                  {visit.diagnosis}
                </p>
              </div>
            </div>
          </div>

          {/* Doctor Notes Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Doctor Notes & Plan</span>
            </h3>
            <p style={{ color: visit.doctor_notes ? 'white' : 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {visit.doctor_notes || 'No detailed consult notes provided for this visit.'}
            </p>
          </div>

          {/* Prescriptions Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-success)' }} />
                <span>Visit Prescriptions (Rx)</span>
              </h3>
              {(user?.role === 'Admin' || user?.role === 'Doctor') && (
                <Link 
                  to={`/patients/${patientId}/visits/${visitId}/prescriptions/add`} 
                  className="btn-action" 
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={14} />
                  <span>Write Prescription</span>
                </Link>
              )}
            </div>

            {prescriptionsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading prescriptions...</span>
              </div>
            ) : prescriptions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                No prescriptions recorded for this visit consult.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {prescriptions.map((pres) => (
                  <div 
                    key={pres.id} 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.01)', 
                      border: '1px solid var(--glass-border)', 
                      padding: '1rem', 
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Prescribed by Dr. {pres.doctor_name}
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'white', marginTop: '0.25rem' }}>
                        <strong>Meds:</strong> {pres.medicines_summary}
                      </p>
                    </div>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <Link 
                        to={`/patients/${patientId}/prescriptions/${pres.id}`} 
                        className="btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        Details & Print
                      </Link>
                      {(user?.role === 'Admin' || user?.role === 'Doctor') && (
                        <Link 
                          to={`/patients/${patientId}/visits/${visitId}/prescriptions/edit/${pres.id}`} 
                          className="btn-secondary" 
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing Details Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Visit Billing & Invoice</span>
              </h3>
              {!billLoading && !bill && (user?.role === 'Admin' || user?.role === 'Receptionist') && (
                <Link 
                  to={`/patients/${patientId}/visits/${visitId}/bills/add`} 
                  className="btn-action" 
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Plus size={14} />
                  <span>Generate Bill</span>
                </Link>
              )}
            </div>

            {billLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading bill invoice...</span>
              </div>
            ) : !bill ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 1rem' }}>
                No billing invoice has been generated for this visit.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div 
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.01)', 
                    border: '1px solid var(--glass-border)', 
                    padding: '1.25rem', 
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Invoice Number</span>
                      <h4 style={{ fontWeight: 700, color: 'white', fontSize: '1rem', marginTop: '0.1rem' }}>
                        {bill.bill_number}
                      </h4>
                    </div>
                    <div>
                      {(() => {
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
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            color: statusColor,
                            backgroundColor: statusBg,
                            border: `1px solid ${statusColor}33`
                          }}>
                            {bill.payment_status}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>Total Amount</span>
                      <strong style={{ color: 'white', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{parseFloat(bill.total_amount).toLocaleString()} PKR</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>Amount Paid</span>
                      <strong style={{ color: '#10b981', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{parseFloat(bill.amount_paid).toLocaleString()} PKR</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.7rem' }}>Remaining</span>
                      <strong style={{ color: parseFloat(bill.remaining_amount) > 0 ? 'var(--color-danger)' : '#10b981', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {parseFloat(bill.remaining_amount).toLocaleString()} PKR
                      </strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Link 
                      to={`/patients/${patientId}/bills/${bill.id}`} 
                      className="btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      View Details & Pay
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Vitals, Doctor info & Follow-up */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Consultant Doctor Card */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-role-doctor)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User size={18} style={{ color: 'var(--color-role-doctor)' }} />
              <span>Attending Physician</span>
            </h3>
            <h4 style={{ fontWeight: 600, color: 'white' }}>{visit.doctor_name}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consultant Medical Practitioner</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Calendar size={14} />
              <span>Visit Date: <strong>{new Date(visit.visit_date).toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Vitals Summary Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <HeartPulse size={18} style={{ color: 'var(--color-danger)' }} />
              <span>Logged Vitals</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Blood Pressure</span>
                <span style={{ fontWeight: 600, color: visit.blood_pressure ? 'white' : 'var(--text-muted)' }}>
                  {visit.blood_pressure || 'Not Logged'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Weight</span>
                <span style={{ fontWeight: 600, color: visit.weight_kg ? 'white' : 'var(--text-muted)' }}>
                  {visit.weight_kg ? `${visit.weight_kg} kg` : 'Not Logged'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Temperature</span>
                <span style={{ fontWeight: 600, color: visit.temperature_f ? 'white' : 'var(--text-muted)' }}>
                  {visit.temperature_f ? `${visit.temperature_f} °F` : 'Not Logged'}
                </span>
              </div>
            </div>
          </div>

          {/* Follow-up directive Card */}
          {visit.follow_up_date && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ClipboardCheck size={18} style={{ color: 'var(--color-warning)' }} />
                <span>Follow-up Directive</span>
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Scheduled for follow-up review on:
              </p>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                {new Date(visit.follow_up_date).toLocaleDateString()}
              </h4>
            </div>
          )}

          {/* Upload panel (Doctor / Admin only) */}
          {(user?.role === 'Admin' || user?.role === 'Doctor') && (
            <ImageUpload visitId={visitId || ''} onUploadSuccess={fetchVisitImages} />
          )}

          {/* Visit Image Gallery Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <ImageIcon size={18} style={{ color: 'var(--color-primary)' }} />
              <span>Clinical Documents & Reports</span>
            </h3>

            {imagesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading gallery...</span>
              </div>
            ) : images.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                No diagnostic images attached to this visit.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                {images.map((img) => (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    style={{ 
                      position: 'relative', 
                      aspectRatio: '1', 
                      borderRadius: '6px', 
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
                        <FileText size={28} />
                        <span style={{ fontSize: '0.5rem', marginTop: '0.2rem', textTransform: 'uppercase', fontWeight: 'bold' }}>PDF Report</span>
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
                      background: 'rgba(0,0,0,0.6)', 
                      color: 'white', 
                      fontSize: '0.6rem', 
                      padding: '2px', 
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {img.image_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {selectedImage && (
        <ImagePreviewModal 
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDeleteSuccess={fetchVisitImages}
          onUpdateSuccess={fetchVisitImages}
        />
      )}

    </div>
  );
};
export default VisitDetails;
