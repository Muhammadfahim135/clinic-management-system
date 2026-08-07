import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReportFilters } from '../components/ReportFilters';
import { CreditCard, Landmark, Coins, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface RevenueRow {
  period: string;
  total_billed: string | number;
  total_paid: string | number;
  total_outstanding: string | number;
  invoice_count: string | number;
}

interface RevenueSummary {
  total_billed: string | number;
  total_paid: string | number;
  total_outstanding: string | number;
}

export const RevenueReport = () => {
  const { apiFetch, user, token } = useAuth();
  const navigate = useNavigate();

  // Guard routing - redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/reports');
    }
  }, [user, navigate]);

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState(''); // Payment Status
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [aggregation, setAggregation] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Report data state
  const [reportData, setReportData] = useState<RevenueRow[]>([]);
  const [summary, setSummary] = useState<RevenueSummary>({
    total_billed: 0,
    total_paid: 0,
    total_outstanding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReport = async (filters = { startDate, endDate, status, patientId, aggregation }) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '/reports/revenue';
      const params: string[] = [];
      if (filters.startDate) params.push(`startDate=${filters.startDate}`);
      if (filters.endDate) params.push(`endDate=${filters.endDate}`);
      if (filters.status) params.push(`status=${filters.status}`);
      if (filters.patientId) params.push(`patientId=${filters.patientId}`);
      if (filters.aggregation) params.push(`aggregation=${filters.aggregation}`);

      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const data = await apiFetch(endpoint);
      setReportData(data.report || []);
      setSummary(data.summary || {
        total_billed: 0,
        total_paid: 0,
        total_outstanding: 0,
      });
      setCurrentPage(1); // Reset page to 1 on new filter
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Revenue Report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchReport();
    }
  }, [user]);

  const handleFilterChange = (newFilters: {
    startDate: string;
    endDate: string;
    status: string;
    patientId: string;
    patientName: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
  }) => {
    setStartDate(newFilters.startDate);
    setEndDate(newFilters.endDate);
    setStatus(newFilters.status);
    setPatientId(newFilters.patientId);
    setPatientName(newFilters.patientName);
    const aggVal = newFilters.aggregation || 'daily';
    setAggregation(aggVal);
    
    fetchReport({
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
      status: newFilters.status,
      patientId: newFilters.patientId,
      aggregation: aggVal,
    });
  };

  const handleExportCsv = async () => {
    try {
      let queryParams = `reportName=revenue`;
      if (startDate) queryParams += `&startDate=${startDate}`;
      if (endDate) queryParams += `&endDate=${endDate}`;
      if (status) queryParams += `&status=${status}`;
      if (patientId) queryParams += `&patientId=${patientId}`;
      if (aggregation) queryParams += `&aggregation=${aggregation}`;

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
      link.setAttribute('download', `revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
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

  // Helper formatting helper
  const formatCurrency = (val: string | number) => {
    const num = parseFloat(String(val));
    return isNaN(num) ? 'Rs. 0.00' : `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPeriodHeader = (period: string) => {
    const d = new Date(period);
    if (aggregation === 'daily') {
      return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    } else if (aggregation === 'weekly') {
      return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = reportData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!user || user.role !== 'Admin') return null;

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '2rem' }} className="no-print">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Revenue & Billings Audit Report
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
          Overview of total billing invoices issued, cash collections received, and outstanding debts.
        </p>
      </div>

      {/* Print View Header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '2rem', borderBottom: '2px solid #334155', paddingBottom: '1rem' }}>
        <h2 style={{ color: 'black', fontSize: '1.5rem', fontWeight: 'bold' }}>CLINIC CORE - REVENUE & BILLING REPORT</h2>
        <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Report Period: {startDate || 'All Time'} to {endDate || 'Today'}
          {status && ` | Payment Status: ${status}`}
          {patientName && ` | Patient: ${patientName} (${patientId})`}
          {` | Aggregation: ${aggregation}`}
        </p>
      </div>

      {/* Filter Component */}
      <ReportFilters
        startDate={startDate}
        endDate={endDate}
        status={status}
        patientId={patientId}
        patientName={patientName}
        aggregation={aggregation}
        onFilterChange={handleFilterChange}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        loading={loading}
        showStatus="billing"
        showAggregation={true}
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Total Billed */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-role-admin)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Total Billed</h4>
            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>{formatCurrency(summary.total_billed)}</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Coins size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Amount Received</h4>
            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.1rem' }}>{formatCurrency(summary.total_paid)}</p>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--border-radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase' }}>Outstanding Debt</h4>
            <p style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-danger)', marginTop: '0.1rem' }}>{formatCurrency(summary.total_outstanding)}</p>
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
            No billing records matched the selected period.
          </p>
        ) : (
          <>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period / Date</th>
                    <th>Invoices Issued</th>
                    <th>Total Billed</th>
                    <th>Amount Received</th>
                    <th>Outstanding Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'white' }}>{formatPeriodHeader(row.period)}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{row.invoice_count}</td>
                      <td style={{ color: 'white', fontWeight: 500 }}>{formatCurrency(row.total_billed)}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 500 }}>{formatCurrency(row.total_paid)}</td>
                      <td style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{formatCurrency(row.total_outstanding)}</td>
                    </tr>
                  ))}
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
export default RevenueReport;
