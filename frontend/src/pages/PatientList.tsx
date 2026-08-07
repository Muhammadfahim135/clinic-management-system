import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  UserPlus, 
  Eye, 
  Edit, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface PatientSummary {
  id: string;
  patient_code: string;
  name: string;
  father_name: string;
  gender: string;
  age: number;
  cnic: string;
  created_at: string;
  doctor_name: string;
}

export const PatientList = () => {
  const { apiFetch, user } = useAuth();
  const isStaff = user?.role === 'Admin' || user?.role === 'Receptionist';
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async (queryStr = '') => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = queryStr ? `/patients?query=${encodeURIComponent(queryStr)}` : '/patients';
      const data = await apiFetch(endpoint);
      setPatients(data.patients);
    } catch (err: any) {
      setError(err.message || 'Failed to search patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header section */}
      <div className="table-header-container">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Patient Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Search or view clinical registrations, profiles, and contact details
          </p>
        </div>

        {isStaff && (
          <Link to="/patients/register" className="btn-action">
            <UserPlus size={16} />
            <span>Register Patient</span>
          </Link>
        )}
      </div>

      {/* Search form */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="input-wrapper" style={{ flexGrow: 1 }}>
            <Search className="input-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Patient ID (e.g. PAT-000001), Full Name, CNIC, or Contact Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <span>Search</span>
            )}
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => { setSearchQuery(''); fetchPatients(''); }}
            disabled={loading}
          >
            Clear
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Patient list table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Searching registry database...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>CNIC</th>
                <th>Age / Gender</th>
                <th>Assigned Doctor</th>
                <th>Reg. Date</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <FileSpreadsheet size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>No patients match the search criteria.</p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {p.patient_code}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'white' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Father: {p.father_name}</div>
                    </td>
                    <td>{p.cnic}</td>
                    <td>
                      {p.age} yrs / <span style={{ textTransform: 'capitalize' }}>{p.gender}</span>
                    </td>
                    <td>
                      <span className="profile-role-badge role-doctor" style={{ fontSize: '0.8rem' }}>
                        {p.doctor_name}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'center' }}>
                        <Link 
                          to={`/patients/${p.id}`} 
                          className="btn-icon edit" 
                          title="View Profile"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Eye size={14} />
                        </Link>
                        {isStaff && (
                          <Link 
                            to={`/patients/edit/${p.id}`} 
                            className="btn-icon" 
                            title="Edit Patient"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Edit size={14} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default PatientList;
