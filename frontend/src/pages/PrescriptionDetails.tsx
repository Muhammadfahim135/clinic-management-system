import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Printer, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  FileText, 
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface MedicineItem {
  id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string | null;
}

interface PrescriptionDetail {
  id: string;
  visit_id: string;
  instructions: string | null;
  prescribed_by: string;
  prescribed_at: string;
  visit_date: string;
  diagnosis: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  date_of_birth: string;
  gender: string;
  age: number;
  cnic: string;
  address: string;
  doctor_name: string;
  items: MedicineItem[];
}

export const PrescriptionDetails = () => {
  const { id: patientId, prescriptionId } = useParams<{ id: string; prescriptionId: string }>();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  // Role permissions
  const canModify = user?.role === 'Admin' || user?.role === 'Doctor';

  // States
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/prescriptions/${prescriptionId}`);
      setPrescription(data.prescription);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve prescription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [prescriptionId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this prescription? This will soft-delete the record.')) {
      return;
    }

    setDeleteLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
      });
      if (result.success) {
        navigate(`/patients/${patientId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete prescription.');
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Stylesheet override specifically for print mode */}
      <style>{`
        @media print {
          /* Hide non-printable app wrapper nodes */
          .sidebar, 
          .navbar, 
          .btn-secondary, 
          .btn-primary, 
          .btn-action, 
          .btn-icon, 
          .no-print,
          header,
          footer {
            display: none !important;
          }
          
          /* Full page utilization with white backgrounds */
          body, .content-container, .main-wrapper, #root {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            min-height: auto !important;
          }
          
          .app-layout, .main-wrapper, .content-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Printable layout formatting */
          .print-prescription-slip {
            display: block !important;
            width: 100% !important;
            font-family: 'Outfit', 'Inter', sans-serif !important;
            color: #000000 !important;
            padding: 1.5cm !important;
            background: #ffffff !important;
          }
          
          .print-header {
            border-bottom: 2px solid #000000 !important;
            padding-bottom: 0.5rem !important;
            margin-bottom: 1.5rem !important;
          }

          .print-clinic-name {
            font-size: 1.6rem !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            color: #000000 !important;
          }

          .print-patient-info {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
            font-size: 0.9rem !important;
            border: 1px solid #000000 !important;
            padding: 0.75rem !important;
            border-radius: 4px !important;
            margin-bottom: 1.5rem !important;
          }

          .print-rx-symbol {
            font-size: 2.2rem !important;
            font-weight: 700 !important;
            font-family: serif !important;
            margin-bottom: 0.5rem !important;
          }

          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 1.5rem !important;
          }

          .print-table th {
            border-bottom: 2px solid #000000 !important;
            padding: 0.5rem !important;
            text-align: left !important;
            font-weight: 600 !important;
            font-size: 0.85rem !important;
          }

          .print-table td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 0.6rem 0.5rem !important;
            font-size: 0.85rem !important;
          }

          .print-instructions {
            margin-top: 1.5rem !important;
            font-size: 0.9rem !important;
          }

          .print-signature-area {
            margin-top: 3cm !important;
            text-align: right !important;
            font-size: 0.9rem !important;
          }
        }

        /* Default hidden state for print slip on desktop screen */
        .print-prescription-slip {
          display: none;
        }
      `}</style>

      {/* Action header on Desktop screen */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link 
          to={`/patients/${patientId}`} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </Link>

        {prescription && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handlePrint}
            >
              <Printer size={16} />
              <span>Print Prescription</span>
            </button>

            {canModify && (
              <>
                <Link 
                  to={`/patients/${patientId}/visits/${prescription.visit_id}/prescriptions/edit/${prescription.id}`} 
                  className="btn-secondary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Edit size={14} />
                  <span>Edit Details</span>
                </Link>
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'none' }}
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  <Trash2 size={14} />
                  <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading prescription sheet...</span>
        </div>
      ) : error || !prescription ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Prescription Sheet Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {error || 'The requested clinical prescription could not be located.'}
          </p>
          <Link to={`/patients/${patientId}`} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Patient Profile
          </Link>
        </div>
      ) : (
        /* Screen View layout */
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Medicines List & General Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Medicines List Grid */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Prescribed Medications (Rx)</span>
              </h3>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, color: 'white' }}>{item.medicine_name}</td>
                        <td>{item.dosage}</td>
                        <td>{item.frequency}</td>
                        <td>{item.duration}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General advice instructions */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-success)' }} />
                <span>Dietary & General Instructions</span>
              </h3>
              <p style={{ color: prescription.instructions ? 'white' : 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {prescription.instructions || 'No dietary or general advice instructions registered.'}
              </p>
            </div>

          </div>

          {/* Right Column: Patient information card and Physician details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Attending physician details */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-role-doctor)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <User size={18} style={{ color: 'var(--color-role-doctor)' }} />
                <span>Prescribing Doctor</span>
              </h3>
              <h4 style={{ fontWeight: 600, color: 'white' }}>{prescription.doctor_name}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attending Consultant Physician</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Calendar size={14} />
                <span>Prescribed on: <strong>{new Date(prescription.prescribed_at).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Patient overview card details */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <Activity size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Patient Vitals Context</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
                  <strong style={{ color: 'white' }}>{prescription.patient_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Patient ID:</span>
                  <strong style={{ color: 'white' }}>{prescription.patient_code}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gender / Age:</span>
                  <strong style={{ color: 'white' }}>{prescription.gender} / {prescription.age} yrs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Consult Date:</span>
                  <strong style={{ color: 'white' }}>{new Date(prescription.visit_date).toLocaleDateString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Consult Diagnosis:</span>
                  <strong style={{ color: '#10b981' }}>{prescription.diagnosis}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* PRINT SLIP VIEW: ONLY VISIBLE TO THE BROWSER PRINT ENGINE */}
      {prescription && (
        <div className="print-prescription-slip">
          {/* Letterhead Header */}
          <div className="print-header">
            <div className="print-clinic-name">Clinic Management Core</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>
              Multi-Specialty Clinical Services & Medical Practitioner Roster
            </div>
          </div>

          {/* Patient Details slip bar */}
          <div className="print-patient-info">
            <div>
              <strong>Patient Name:</strong> {prescription.patient_name}
            </div>
            <div>
              <strong>Date:</strong> {new Date(prescription.prescribed_at).toLocaleDateString()}
            </div>
            <div>
              <strong>Patient ID:</strong> {prescription.patient_code}
            </div>
            <div>
              <strong>Age / Gender:</strong> {prescription.age} yrs / {prescription.gender}
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong>Consult Diagnosis:</strong> {prescription.diagnosis}
            </div>
          </div>

          {/* Rx Symbol */}
          <div className="print-rx-symbol">Rx</div>

          {/* Medicines Grid Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Medicine Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.medicine_name}</strong>
                    {item.notes && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#475569', marginTop: '0.1rem' }}>({item.notes})</div>}
                  </td>
                  <td>{item.dosage}</td>
                  <td>{item.frequency}</td>
                  <td>{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Instructions section */}
          {prescription.instructions && (
            <div className="print-instructions">
              <h4 style={{ borderBottom: '1px solid #000000', paddingBottom: '0.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                Dietary & General Instructions:
              </h4>
              <p style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>{prescription.instructions}</p>
            </div>
          )}

          {/* Doctor Signature */}
          <div className="print-signature-area">
            <div style={{ width: '200px', display: 'inline-block', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #000000', height: '1.2cm', marginBottom: '0.25rem' }}></div>
              <strong>Dr. {prescription.doctor_name}</strong>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.1rem' }}>Attending Clinical Physician</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default PrescriptionDetails;
