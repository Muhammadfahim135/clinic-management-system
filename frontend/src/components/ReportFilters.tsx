import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Calendar, Filter, RotateCcw, Download, Printer, Loader2, X } from 'lucide-react';

interface PatientSummary {
  id: string;
  patient_code: string;
  name: string;
  cnic: string;
}

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  status?: string;
  patientId?: string;
  patientName?: string;
  aggregation?: 'daily' | 'weekly' | 'monthly';
  onFilterChange: (filters: {
    startDate: string;
    endDate: string;
    status: string;
    patientId: string;
    patientName: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
  }) => void;
  showStatus?: 'appointment' | 'billing' | 'none';
  showAggregation?: boolean;
  onExportCsv?: () => void;
  onPrint?: () => void;
  loading?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  startDate,
  endDate,
  status = '',
  patientId = '',
  patientName = '',
  aggregation = 'daily',
  onFilterChange,
  showStatus = 'none',
  showAggregation = false,
  onExportCsv,
  onPrint,
  loading = false,
}) => {
  const { apiFetch } = useAuth();
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [localStatus, setLocalStatus] = useState(status);
  const [localAggregation, setLocalAggregation] = useState(aggregation);
  
  // Patient search state
  const [patientSearch, setPatientSearch] = useState(patientName);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId);
  const [selectedPatientName, setSelectedPatientName] = useState(patientName);
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync inputs with props when they change
  useEffect(() => {
    setLocalStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    setLocalEndDate(endDate);
  }, [endDate]);

  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  useEffect(() => {
    setLocalAggregation(aggregation);
  }, [aggregation]);

  useEffect(() => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setPatientSearch(patientName);
  }, [patientId, patientName]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch patient suggestions
  useEffect(() => {
    if (!patientSearch || patientSearch === selectedPatientName) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingPatients(true);
      try {
        const data = await apiFetch(`/patients?query=${encodeURIComponent(patientSearch)}`);
        setSearchResults(data.patients || []);
        setShowDropdown(true);
      } catch (err) {
        console.error('Error fetching patients for autocomplete:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientSearch, selectedPatientName, apiFetch]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      startDate: localStartDate,
      endDate: localEndDate,
      status: localStatus,
      patientId: selectedPatientId,
      patientName: selectedPatientName,
      aggregation: localAggregation,
    });
  };

  const handleReset = () => {
    setLocalStartDate('');
    setLocalEndDate('');
    setLocalStatus('');
    setLocalAggregation('daily');
    setPatientSearch('');
    setSelectedPatientId('');
    setSelectedPatientName('');
    setSearchResults([]);
    setShowDropdown(false);

    onFilterChange({
      startDate: '',
      endDate: '',
      status: '',
      patientId: '',
      patientName: '',
      aggregation: 'daily',
    });
  };

  const selectPatient = (p: PatientSummary) => {
    setSelectedPatientId(p.id);
    setSelectedPatientName(p.name);
    setPatientSearch(p.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const clearPatientSelection = () => {
    setSelectedPatientId('');
    setSelectedPatientName('');
    setPatientSearch('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="glass-card no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <form onSubmit={handleApply} className="no-print">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          
          {/* Start Date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={16} />
              <input
                type="date"
                className="form-input"
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* End Date */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={16} />
              <input
                type="date"
                className="form-input"
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Patient Lookup */}
          <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={dropdownRef}>
            <label className="form-label">Patient Lookup</label>
            <div className="input-wrapper">
              <Search className="input-icon" size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Search patient..."
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  if (selectedPatientId) clearPatientSelection();
                }}
                style={{ paddingLeft: '2.5rem', paddingRight: selectedPatientId ? '2.5rem' : '1rem' }}
              />
              {selectedPatientId && (
                <button
                  type="button"
                  onClick={clearPatientSelection}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Patient Search Results Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                  zIndex: 200,
                  marginTop: '0.25rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.85rem',
                      transition: 'var(--transition-smooth)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ fontWeight: 600, color: 'white' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.patient_code} • CNIC: {p.cnic}</div>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && searchResults.length === 0 && patientSearch && !searchingPatients && patientSearch !== selectedPatientName && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--border-radius-sm)',
                  zIndex: 200,
                  marginTop: '0.25rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                No patients found.
              </div>
            )}
          </div>

          {/* Status Filter */}
          {showStatus !== 'none' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={localStatus}
                onChange={(e) => setLocalStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {showStatus === 'appointment' ? (
                  <>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="No Show">No Show</option>
                  </>
                ) : (
                  <>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Aggregation Filter (for Revenue Report only) */}
          {showAggregation && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Aggregation Group</label>
              <select
                className="form-select"
                value={localAggregation}
                onChange={(e) => setLocalAggregation(e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Apply & Reset */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Filter size={16} style={{ marginRight: '0.5rem' }} />
                  <span>Apply Filters</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>

          {/* Exports */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {onExportCsv && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onExportCsv}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}
                disabled={loading}
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            )}
            {onPrint && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onPrint}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(14, 165, 233, 0.2)', color: '#93c5fd' }}
                disabled={loading}
              >
                <Printer size={16} />
                <span>Print Report</span>
              </button>
            )}
          </div>

        </div>
      </form>
    </div>
  );
};
