import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReportFilters } from '../components/ReportFilters';
import { AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: 'Walk-in' | 'Scheduled';
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled' | 'No Show';
  notes: string | null;
  patient_name: string;
  patient_code: string;
  patient_id: string;
}

interface AppointmentSummary {
  total: number;
  scheduled: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export const AppointmentReport = () => {
  const { apiFetch, token } = useAuth();

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');

  // Report data state
  const [reportData, setReportData] = useState<AppointmentRow[]>([]);
  const [summary, setSummary] = useState<AppointmentSummary>({
    total: 0,
    scheduled: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReport = async (filters = { startDate, endDate, status, patientId }) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/reports/appointments';
      const params: string[] = [];
      if (filters.startDate) params.push(`startDate=${filters.startDate}`);
      if (filters.endDate) params.push(`endDate=${filters.endDate}`);
      if (filters.status) params.push(`status=${filters.status}`);
      if (filters.patientId) params.push(`patientId=${filters.patientId}`);

      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const data = await apiFetch(endpoint);
      setReportData(data.report || []);
      setSummary(data.summary || {
        total: 0,
        scheduled: 0,
        checked_in: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      });
      setCurrentPage(1); // Reset page to 1 on new filter
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Appointment Report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilterChange = (newFilters: {
    startDate: string;
    endDate: string;
    status: string;
    patientId: string;
    patientName: string;
  }) => {
    setStartDate(newFilters.startDate);
    setEndDate(newFilters.endDate);
    setStatus(newFilters.status);
    setPatientId(newFilters.patientId);
    setPatientName(newFilters.patientName);
    fetchReport({
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      status: newFilters.status,
      patientId: newFilters.patientId,
    });
  };

  const handleExportCsv = async () => {
    try {
      let queryParams = `reportName=appointments`;
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;
      if (status) queryParams += `&status=${status}`;
      if (patientId) queryParams += `&patientId=${patientId}`;

      const response = await fetch(`http://localhost:5000/api/reports/export?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate export file');
      }

      const csvText = await response.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `appointment_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV file.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Scheduled': return 'var(--badge-scheduled-color)';
      case 'Checked In': return 'var(--badge-checked-in-color)';
      case 'Completed': return 'var(--badge-completed-color)';
      case 'Cancelled': return 'var(--badge-cancelled-color)';
      case 'No Show': return 'var(--badge-noshow-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'Scheduled':
        return {
          background: 'var(--badge-scheduled-bg)',
          border: '1px solid var(--badge-scheduled-border)',
          color: 'var(--badge-scheduled-color)',
        };
      case 'Checked In':
        return {
          background: 'var(--badge-checked-in-bg)',
          border: '1px solid var(--badge-checked-in-border)',
          color: 'var(--badge-checked-in-color)',
        };
      case 'Completed':
        return {
          background: 'var(--badge-completed-bg)',
          border: '1px solid var(--badge-completed-border)',
          color: 'var(--badge-completed-color)',
        };
      case 'Cancelled':
        return {
          background: 'var(--badge-cancelled-bg)',
          border: '1px solid var(--badge-cancelled-border)',
          color: 'var(--badge-cancelled-color)',
        };
      case 'No Show':
        return {
          background: 'var(--badge-noshow-bg)',
          border: '1px solid var(--badge-noshow-border)',
          color: 'var(--badge-noshow-color)',
        };
      default:
        return {};
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = reportData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }} className="no-print">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Appointment Queue Report
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
          Audit booked slots, check-ins, medical consult outcomes, no-shows, and booking channels.
        </p>
      </div>

      {/* Print View Header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '2rem', borderBottom: '2px solid #334155', paddingBottom: '1rem' }}>
        <h2 style={{ color: 'black', fontSize: '1.5rem', fontWeight: 'bold' }}>CLINIC CORE - APPOINTMENT REPORT</h2>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Report Period: {startDate || 'All Time'} to {endDate || 'Today'}
          {status && ` | Status: ${status}`}
          {patientName && ` | Patient: ${patientName} (${patientId})`}
        </p>
      </div>

      {/* Filter Component */}
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        status={status}
        patientId={patientId}
        patientName={patientName}
        onFilterChange={handleFilterChange}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        loading={loading}
        showStatus="appointment"
      />

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        {/* Total */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Total Slots</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.2rem' }}>{summary.total}</h3>
        </div>

        {/* Scheduled */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `3px solid ${getStatusColor('Scheduled')}` }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Scheduled</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: getStatusColor('Scheduled'), marginTop: '0.2rem' }}>{summary.scheduled}</h3>
        </div>

        {/* Checked In */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `3px solid ${getStatusColor('Checked In')}` }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Checked In</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: getStatusColor('Checked In'), marginTop: '0.2rem' }}>{summary.checked_in}</h3>
        </div>

        {/* Completed */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `3px solid ${getStatusColor('Completed')}` }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Completed</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: getStatusColor('Completed'), marginTop: '0.2rem' }}>{summary.completed}</h3>
        </div>

        {/* Cancelled */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `3px solid ${getStatusColor('Cancelled')}` }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Cancelled</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: getStatusColor('Cancelled'), marginTop: '0.2rem' }}>{summary.cancelled}</h3>
        </div>

        {/* No Show */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `3px solid ${getStatusColor('No Show')}` }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>No Shows</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: getStatusColor('No Show'), marginTop: '0.2rem' }}>{summary.no_show}</h3>
        </div>

      </div>

      {/* Main Table Card */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Generating report...</span>
          </div>
        ) : reportData.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '3rem 0' }}>
            No appointments matched the search criteria.
          </p>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Patient Name</th>
                    <th>Patient Code</th>
                    <th>Booking Channel</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => {
                    const d = new Date(row.appointment_date);
                    const formattedDate = d.toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    });

                    return (
                      <tr key={row.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: 'white' }}>{formattedDate}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.appointment_time.slice(0, 5)}</div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, color: 'white' }}>{row.patient_name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{row.patient_code}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.appointment_type}</td>
                        <td>
                          <span 
                            style={{
                              display: 'inline-flex',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              ...getStatusStyle(row.status)
                            }}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={row.notes || ''}>
                          {row.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }} className="no-print">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({reportData.length} records)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-icon"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};
export default AppointmentReport;
