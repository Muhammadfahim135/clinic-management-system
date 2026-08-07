import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

interface BillItemInput {
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export const BillForm = () => {
  const { id: patientId, visitId, billId } = useParams<{ id: string; visitId?: string; billId?: string }>();
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const isEditMode = !!billId;

  // Header / Context states
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [visitDiagnosis, setVisitDiagnosis] = useState('');
  const [targetVisitId, setTargetVisitId] = useState(visitId || '');

  // Form states
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BillItemInput[]>([
    { itemName: 'Consultation Fee', description: 'Standard visit charges', quantity: 1, unitPrice: 1500, discount: 0 }
  ]);

  // Loading/Error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Totals calculations
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() - calculateTotalDiscount();
  };

  useEffect(() => {
    const fetchContextData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isEditMode) {
          // Edit mode: fetch bill details (which includes patient/visit details)
          const billData = await apiFetch(`/bills/${billId}`);
          setPatientName(billData.bill.patient_name);
          setPatientCode(billData.bill.patient_code);
          setVisitDiagnosis(billData.bill.diagnosis);
          setTargetVisitId(billData.bill.visit_id);
          setNotes(billData.bill.notes || '');

          const mappedItems = billData.bill.items.map((item: any) => ({
            itemName: item.item_name,
            description: item.description || '',
            quantity: parseInt(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            discount: parseFloat(item.discount || 0)
          }));
          setItems(mappedItems);
        } else {
          // Create mode: fetch visit details to populate header information
          const visitData = await apiFetch(`/visits/${visitId}`);
          setPatientName(visitData.visit.patient_name);
          setPatientCode(visitData.visit.patient_code);
          setVisitDiagnosis(visitData.visit.diagnosis);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load billing context.');
      } finally {
        setLoading(false);
      }
    };

    fetchContextData();
  }, [visitId, billId, isEditMode]);

  // Add/Remove dynamic rows
  const handleAddRow = () => {
    setItems([
      ...items,
      { itemName: '', description: '', quantity: 1, unitPrice: 0, discount: 0 }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length === 1) {
      alert('An invoice must contain at least one bill item.');
      return;
    }
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof BillItemInput, value: string | number) => {
    const updated = [...items];
    if (field === 'quantity') {
      updated[index][field] = parseInt(value as string) || 0;
    } else if (field === 'unitPrice' || field === 'discount') {
      updated[index][field] = parseFloat(value as string) || 0;
    } else {
      updated[index][field] = value as any;
    }
    setItems(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Dynamic items client-side validations
    if (items.length === 0) {
      setError('At least one item is required in the invoice.');
      setSaving(false);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName.trim()) {
        setError(`Row #${i + 1}: Item Name cannot be empty.`);
        setSaving(false);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Row #${i + 1}: Quantity must be greater than zero.`);
        setSaving(false);
        return;
      }
      if (item.unitPrice < 0) {
        setError(`Row #${i + 1}: Unit Price must be non-negative.`);
        setSaving(false);
        return;
      }
      if (item.discount < 0) {
        setError(`Row #${i + 1}: Discount must be non-negative.`);
        setSaving(false);
        return;
      }
      if (item.discount > (item.quantity * item.unitPrice)) {
        setError(`Row #${i + 1}: Discount cannot exceed subtotal.`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        patientId,
        visitId: targetVisitId,
        items,
        notes: notes.trim(),
      };

      let result;
      if (isEditMode) {
        result = await apiFetch(`/bills/${billId}`, {
          method: 'PUT',
          body: JSON.stringify({ items, notes: notes.trim() }),
        });
      } else {
        result = await apiFetch('/bills', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (result.success) {
        if (isEditMode) {
          navigate(`/patients/${patientId}/bills/${billId}`);
        } else {
          navigate(`/patients/${patientId}/visits/${visitId}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => {
            if (isEditMode) {
              navigate(`/patients/${patientId}/bills/${billId}`);
            } else {
              navigate(`/patients/${patientId}/visits/${visitId}`);
            }
          }} 
          className="btn-secondary" 
          style={{ padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEditMode ? 'Modify Patient Invoice' : 'Generate Visit Invoice'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {isEditMode ? 'Edit items, discounts, and billing entries' : 'Create charges, configure discounts, and issue visit bill'}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Loading billing information...</span>
        </div>
      ) : error && !patientName ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Context Record Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
          <Link to={`/patients/${patientId}`} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Patient Profile
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Context header card */}
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <DollarSign size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>BILLING CONTEXT</span>
                <h4 style={{ fontWeight: 600, color: 'white', fontSize: '1rem', marginTop: '0.1rem' }}>
                  {patientName} ({patientCode})
                </h4>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>VISIT DIAGNOSIS</span>
              <p style={{ color: '#10b981', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.1rem' }}>{visitDiagnosis || 'Consultation'}</p>
            </div>
          </div>

          {/* Charges Builder */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Invoice Line Items</span>
              </h3>
              <button 
                type="button" 
                className="btn-action" 
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                onClick={handleAddRow}
                disabled={saving}
              >
                <Plus size={14} />
                <span>Add Charge Line</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, index) => {
                const subtotal = item.quantity * item.unitPrice;
                const total = subtotal - item.discount;

                return (
                  <div 
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 1.5fr 1.25fr 1.25fr auto',
                      gap: '0.75rem',
                      alignItems: 'end',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--glass-border)',
                      padding: '1rem',
                      borderRadius: '6px'
                    }}
                  >
                    {/* Item Name */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Item / Service *</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                        placeholder="e.g. Lab Report"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        disabled={saving}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Description</label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                        placeholder="e.g. CBC report charges"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Qty *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        disabled={saving}
                        required
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Unit Price (PKR) *</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        disabled={saving}
                        required
                      />
                    </div>

                    {/* Discount */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Discount (PKR)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    {/* Total */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Total (PKR)</label>
                      <div style={{
                        padding: '0.4rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'white',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '4px',
                        paddingLeft: '0.5rem'
                      }}>
                        {total.toLocaleString()}
                      </div>
                    </div>

                    {/* Delete */}
                    <button 
                      type="button" 
                      className="btn-icon delete" 
                      style={{ height: '35px', width: '35px', marginBottom: '0px' }}
                      onClick={() => handleRemoveRow(index)}
                      disabled={saving || items.length === 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom section: Notes (left) & Totals grid (right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start', flexWrap: 'wrap' }}>
            
            {/* Notes card */}
            <div className="glass-card" style={{ height: '100%' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span>Invoice Notes & Instructions (Optional)</span>
                </label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.75rem', height: '110px', resize: 'vertical' }}
                  placeholder="Enter comments, discount justifications, or payment terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                Invoice Calculations
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gross Subtotal:</span>
                <strong style={{ color: 'white' }}>{calculateSubtotal().toLocaleString()} PKR</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Discounts:</span>
                <strong style={{ color: 'var(--color-danger)' }}>- {calculateTotalDiscount().toLocaleString()} PKR</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem', fontSize: '1.1rem' }}>
                <span style={{ color: 'white', fontWeight: 600 }}>Grand Total Amount:</span>
                <strong style={{ color: '#10b981', fontSize: '1.25rem' }}>{calculateGrandTotal().toLocaleString()} PKR</strong>
              </div>
            </div>

          </div>

          {/* Error and saving indicators */}
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                if (isEditMode) {
                  navigate(`/patients/${patientId}/bills/${billId}`);
                } else {
                  navigate(`/patients/${patientId}/visits/${visitId}`);
                }
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{isEditMode ? 'Update Invoice' : 'Save Invoice'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

export default BillForm;
