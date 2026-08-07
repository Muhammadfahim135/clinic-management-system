import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Search, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  Activity,
  ArrowRight
} from 'lucide-react';

interface PrescriptionListItem {
  id: string;
  prescribed_at: string;
  instructions: string | null;
  visit_date: string;
  diagnosis: string;
  visit_id: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  doctor_name: string;
  medicines_summary: string | null;
}

export const PrescriptionList = () => {
  const { apiFetch } = useAuth();

  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPrescriptions = async (searchVal: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = searchVal ? `/prescriptions?search=${encodeURIComponent(searchVal)}` : '/prescriptions';
      const data = await apiFetch(endpoint);
      setPrescriptions(data.prescriptions);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve prescriptions registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrescriptions(searchTerm);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Clinical Prescriptions Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            View and search active clinical prescriptions (Rx) issued to clinic patients
          </p>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Patient Name, ID, CNIC, Doctor, or Diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Search</span>
          </button>
          {searchTerm && (
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: 'auto' }}
              onClick={() => { setSearchTerm(''); fetchPrescriptions(''); }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Fetching clinical prescription list...</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Failed to Load Prescriptions</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
          <button onClick={() => fetchPrescriptions(searchTerm)} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Retry Query
          </button>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Prescriptions Found</h3>
          <p style={{ marginTop: '0.5rem' }}>
            {searchTerm ? 'No prescriptions matched your search terms.' : 'No prescriptions have been written yet.'}
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Prescribed Date</th>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Diagnosis</th>
                  <th>Medications Summary</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((pres) => (
                  <tr key={pres.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                        <span>{new Date(pres.prescribed_at).toLocaleDateString()}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginLeft: '1.25rem' }}>
                        {new Date(pres.prescribed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <Link 
                        to={`/patients/${pres.patient_id}`}
                        style={{ fontWeight: 600, color: 'white', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                      >
                        {pres.patient_name}
                      </Link>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {pres.patient_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'white' }}>
                        <User size={14} style={{ color: 'var(--color-role-doctor)' }} />
                        <span>Dr. {pres.doctor_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <Activity size={14} style={{ color: '#10b981' }} />
                        <span style={{ fontWeight: 500 }}>{pres.diagnosis}</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'block', maxWidth: '250px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                        title={pres.medicines_summary || ''}
                      >
                        {pres.medicines_summary || 'No items listed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/patients/${pres.patient_id}/prescriptions/${pres.id}`}
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <span>View Details</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default PrescriptionList;
