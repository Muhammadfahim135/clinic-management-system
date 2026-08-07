import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileSearch, 
  AlertCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  performed_by_name: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_code: string | null;
  details: any | null;
  created_at: string;
}

export const AuditLogs = () => {
  const { apiFetch, user } = useAuth();

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Expanded log rows
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter States
  const [action, setAction] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Active user selections for filtering
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (action) queryParams.push(`action=${encodeURIComponent(action)}`);
      if (performedBy) queryParams.push(`performedBy=${encodeURIComponent(performedBy)}`);
      if (startDate) queryParams.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) queryParams.push(`endDate=${encodeURIComponent(endDate)}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const data = await apiFetch(`/audit-logs${queryString}`);
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message || 'Failed to load system audit trails.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await apiFetch('/users');
      setUsersList(data.users);
    } catch (err) {
      console.error('Failed to load users for filter:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchUsers();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  const handleReset = () => {
    setAction('');
    setPerformedBy('');
    setStartDate('');
    setEndDate('');
    // Trigger reloading with empty parameters
    setTimeout(() => {
      apiFetch('/audit-logs').then(data => setLogs(data.logs)).catch(err => setError(err.message));
    }, 50);
  };

  const toggleRow = (logId: string) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };

  const getActionBadgeColor = (act: string) => {
    const a = act.toLowerCase();
    if (a.includes('deleted') || a.includes('removed')) {
      return { color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
    }
    if (a.includes('registered') || a.includes('created')) {
      return { color: '#a7f3d0', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (a.includes('updated') || a.includes('modified')) {
      return { color: '#fed7aa', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' };
    }
    return { color: '#e0f2fe', bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' };
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You do not have the required administrative credentials to view clinical audit trails.
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Compliance & Audit Logs
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Track staff actions, record modifications, billing creations, and clinical access history
        </p>
      </div>

      {/* Filter Board */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Action Type</label>
            <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)} style={{ padding: '0.45rem' }}>
              <option value="">All Actions</option>
              <option value="Patient Registered">Patient Registered</option>
              <option value="Patient Profile Updated">Patient Profile Updated</option>
              <option value="Visit Logged">Visit Logged</option>
              <option value="Visit Updated">Visit Updated</option>
              <option value="Visit Deleted">Visit Deleted</option>
              <option value="Bill Created">Bill Created</option>
              <option value="Bill Updated">Bill Updated</option>
              <option value="Payment Recorded">Payment Recorded</option>
              <option value="Department Created">Department Created</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Performed By</label>
            <select className="form-select" value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} style={{ padding: '0.45rem' }} disabled={usersLoading}>
              <option value="">All Users</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Start Date</label>
            <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '0.4rem', paddingLeft: '0.75rem' }} />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '0.75rem' }}>End Date</label>
            <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '0.4rem', paddingLeft: '0.75rem' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', gridColumn: 'span 1' }}>
            <button type="submit" className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }} disabled={loading}>
              Apply
            </button>
            <button type="button" className="btn-secondary" onClick={handleReset} style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }} disabled={loading}>
              Reset
            </button>
          </div>

        </form>
      </div>

      {/* Banners */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading audit trails...</span>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Timestamp</th>
                <th>Staff Member</th>
                <th>Action Category</th>
                <th>Linked Patient</th>
                <th>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    <FileSearch size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>No audit logs matches the search criteria.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badgeStyle = getActionBadgeColor(log.action);
                  const isExpanded = expandedLogId === log.id;
                  
                  return (
                    <React.Fragment key={log.id}>
                      <tr>
                        <td>
                          {log.details && (
                            <button 
                              onClick={() => toggleRow(log.id)} 
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'white' }}>{log.performed_by_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {log.performed_by.slice(0,8)}...</div>
                        </td>
                        <td>
                          <span style={{ 
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: badgeStyle.color,
                            backgroundColor: badgeStyle.bg,
                            border: `1px solid ${badgeStyle.border}`
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          {log.patient_id ? (
                            <div>
                              <div style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{log.patient_code}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.patient_name}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {log.details ? 'Payload attached (Click to expand)' : 'No payload details'}
                        </td>
                      </tr>

                      {isExpanded && log.details && (
                        <tr style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                          <td></td>
                          <td colSpan={5} style={{ padding: '1rem' }}>
                            <div style={{ 
                              background: 'rgba(0,0,0,0.4)', 
                              border: '1px solid var(--glass-border)',
                              borderRadius: '6px',
                              padding: '1rem',
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              color: '#67e8f9',
                              whiteSpace: 'pre-wrap',
                              overflowX: 'auto'
                            }}>
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
export default AuditLogs;
