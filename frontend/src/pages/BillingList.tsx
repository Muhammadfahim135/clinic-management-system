import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Search, 
  Loader2, 
  AlertCircle,
  User,
  ArrowRight
} from 'lucide-react';

interface BillListItem {
  id: string;
  bill_number: string;
  patient_id: string;
  visit_id: string;
  total_amount: string;
  amount_paid: string;
  remaining_amount: string;
  payment_status: 'Unpaid' | 'Partially Paid' | 'Paid';
  notes: string | null;
  created_at: string;
  patient_name: string;
  patient_code: string;
  visit_date: string;
  diagnosis: string;
  creator_name: string;
}

export const BillingList = () => {
  const { apiFetch } = useAuth();

  const [bills, setBills] = useState<BillListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBills = async (searchVal: string = '', statusVal: string = '') => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (searchVal) queryParams.push(`search=${encodeURIComponent(searchVal)}`);
      if (statusVal) queryParams.push(`status=${encodeURIComponent(statusVal)}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const data = await apiFetch(`/bills${queryString}`);
      setBills(data.bills);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve billing records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBills(searchTerm, statusFilter);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    fetchBills(searchTerm, e.target.value);
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Clinical Billing Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage invoices, track payments, and review outstanding accounts
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search text */}
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Patient Name, ID, or Bill Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status dropdown filter */}
          <div style={{ minWidth: '150px' }}>
            <select 
              className="form-select"
              value={statusFilter}
              onChange={handleStatusChange}
              style={{ padding: '0.5rem' }}
            >
              <option value="">All Payment Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Apply Filters</span>
          </button>
          
          {(searchTerm || statusFilter) && (
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ width: 'auto' }}
              onClick={() => { setSearchTerm(''); setStatusFilter(''); fetchBills('', ''); }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Bills Registry Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading invoices...</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Failed to Load Invoices</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
          <button onClick={() => fetchBills(searchTerm, statusFilter)} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Retry Query
          </button>
        </div>
      ) : bills.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Billing Records Found</h3>
          <p style={{ marginTop: '0.5rem' }}>
            {searchTerm || statusFilter ? 'No invoices matched your filters.' : 'No invoices have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill Details</th>
                  <th>Patient Info</th>
                  <th>Attending / Date</th>
                  <th>Total Amount</th>
                  <th>Remaining Balance</th>
                  <th>Payment Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => {
                  let statusColor = 'var(--text-muted)';
                  let statusBg = 'var(--bg-tertiary)';
                  
                  if (bill.payment_status === 'Paid') {
                    statusColor = 'var(--badge-completed-color)';
                    statusBg = 'var(--badge-completed-bg)';
                  } else if (bill.payment_status === 'Partially Paid') {
                    statusColor = 'var(--badge-checked-in-color)';
                    statusBg = 'var(--badge-checked-in-bg)';
                  } else if (bill.payment_status === 'Unpaid') {
                    statusColor = 'var(--badge-cancelled-color)';
                    statusBg = 'var(--badge-cancelled-bg)';
                  }

                  return (
                    <tr key={bill.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bill.bill_number}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Billed on {new Date(bill.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <Link 
                          to={`/patients/${bill.patient_id}`}
                          style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        >
                          {bill.patient_name}
                        </Link>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {bill.patient_code}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          <User size={14} style={{ color: 'var(--color-role-doctor)' }} />
                          <span>Dr. {bill.creator_name}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginLeft: '1.25rem' }}>
                          Visit: {new Date(bill.visit_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'white' }}>
                          {parseFloat(bill.total_amount).toLocaleString()} PKR
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: parseFloat(bill.remaining_amount) > 0 ? 'var(--color-danger)' : '#10b981' 
                        }}>
                          {parseFloat(bill.remaining_amount).toLocaleString()} PKR
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: statusColor,
                          backgroundColor: statusBg,
                          border: `1px solid ${statusColor}33`
                        }}>
                          {bill.payment_status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link 
                          to={`/patients/${bill.patient_id}/bills/${bill.id}`}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <span>View Invoice</span>
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default BillingList;
