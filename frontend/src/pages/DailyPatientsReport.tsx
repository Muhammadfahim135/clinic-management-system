import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReportFilters } from '../components/ReportFilters';
import { Activity, Users, FileSpreadsheet, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyPatientsRow {
  date: string;
  patient_count: string | number;
  visit_count: string | number;
}

export const DailyPatientsReport = () => {
  const { apiFetch, token } = useAuth();
  
  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  
  // Report data state
  const [reportData, setReportData] = useState<DailyPatientsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReport = async (filters = { startDate, endDate, patientId }) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/reports/daily-patients';
      const params: string[] = [];
      if (filters.startDate) params.push(`startDate=${filters.startDate}`);
      if (filters.endDate) params.push(`endDate=${filters.endDate}`);
      if (filters.patientId) params.push(`patientId=${filters.patientId}`);
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const data = await apiFetch(endpoint);
      setReportData(data.report || []);
      setCurrentPage(1); // Reset page to 1 on new filter
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Daily Patients Report.');
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
    setPatientId(newFilters.patientId);
    setPatientName(newFilters.patientName);
    fetchReport({
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      patientId: newFilters.patientId,
    });
  };

  const handleExportCsv = async () => {
    try {
      let queryParams = `reportName=daily-patients`;
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;
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
      link.setAttribute('download', `daily_patients_report_${new Date().toISOString().split('T')[0]}.csv`);
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

  // Aggregated summaries
  const totalVisits = reportData.reduce((acc, row) => acc + Number(row.visit_count), 0);
  const totalDays = reportData.length;
  const avgVisitsPerDay = totalDays > 0 ? (totalVisits / totalDays).toFixed(1) : '0';

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
          Daily Patients Report
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
          Review and audit daily clinical patient volume, consultation counts, and visit metrics.
        </p>
      </div>

      {/* Print View Header (hides on screen) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '2rem', borderBottom: '2px solid #334155', paddingBottom: '1rem' }}>
        <h2 style={{ color: 'black', fontSize: '1.5rem', fontWeight: 'bold' }}>CLINIC CORE - DAILY PATIENTS REPORT</h2>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Report Period: {startDate || 'All Time'} to {endDate || 'Today'}
          {patientName && ` | Patient: ${patientName} (${patientId})`}
        </p>
      </div>

      {/* Filter Component */}
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        patientId={patientId}
        patientName={patientName}
        onFilterChange={handleFilterChange}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        loading={loading}
        showStatus="none"
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Total Visits logged</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{totalVisits}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Total Reporting Days</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{totalDays}</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Avg Visits / Day</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{avgVisitsPerDay}</p>
          </div>
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
            No patient visits recorded in the selected period.
          </p>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Unique Patients Visited</th>
                    <th>Total Consultation Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, index) => {
                    const d = new Date(row.date);
                    const formattedDate = d.toLocaleDateString(undefined, { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    });

                    return (
                      <tr key={index}>
                        <td style={{ fontWeight: 600, color: 'white' }}>{formattedDate}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{row.patient_count}</td>
                        <td style={{ color: 'white', fontWeight: 500 }}>{row.visit_count}</td>
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
export default DailyPatientsReport;
