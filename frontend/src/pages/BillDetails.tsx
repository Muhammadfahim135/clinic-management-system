import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Printer, 
  Edit, 
  Trash2, 
  FileText, 
  Loader2, 
  AlertCircle,
  CreditCard,
  PlusCircle,
  DollarSign,
  CheckCircle2
} from 'lucide-react';

interface BillItem {
  id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: string;
  discount: string;
  total_amount: string;
}

interface PaymentItem {
  id: string;
  receipt_number: string;
  amount_paid: string;
  payment_method: string;
  transaction_reference: string | null;
  payment_date: string;
  receiver_name: string;
}

interface BillDetail {
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
  date_of_birth: string;
  gender: string;
  age: number;
  cnic: string;
  address: string;
  visit_date: string;
  diagnosis: string;
  creator_name: string;
  items: BillItem[];
  payments: PaymentItem[];
}

export const BillDetails = () => {
  const { id: patientId, billId } = useParams<{ id: string; billId: string }>();
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();

  // Role permissions
  const canModify = user?.role === 'Admin' || user?.role === 'Receptionist';

  // States
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Payment Form States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Print states
  const [printType, setPrintType] = useState<'bill' | 'receipt'>('bill');
  const [activeReceipt, setActiveReceipt] = useState<PaymentItem | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/bills/${billId}`);
      setBill(data.bill);
      // Auto pre-fill payment amount with remaining balance
      setPayAmount(data.bill.remaining_amount);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [billId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will soft-delete the record.')) {
      return;
    }

    setDeleteLoading(true);
    setError(null);
    try {
      const result = await apiFetch(`/bills/${billId}`, {
        method: 'DELETE',
      });
      if (result.success) {
        navigate(`/patients/${patientId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete invoice.');
      setDeleteLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError(null);

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError('Amount must be a positive number.');
      setPayLoading(false);
      return;
    }

    if (amount > parseFloat(bill?.remaining_amount || '0')) {
      setPayError('Payment amount cannot exceed the remaining balance.');
      setPayLoading(false);
      return;
    }

    try {
      const result = await apiFetch(`/bills/${billId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amountPaid: amount,
          paymentMethod: payMethod,
          transactionReference: payRef
        })
      });

      if (result.success) {
        setShowPaymentModal(false);
        setPayRef('');
        // Reload details
        await fetchDetails();
      }
    } catch (err: any) {
      setPayError(err.message || 'Failed to record payment details.');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePrintBill = () => {
    setPrintType('bill');
    setActiveReceipt(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintReceipt = (payment: PaymentItem) => {
    setPrintType('receipt');
    setActiveReceipt(payment);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Status Badge calculations
  let statusColor = 'var(--text-muted)';
  let statusBg = 'rgba(255,255,255,0.05)';
  
  if (bill?.payment_status === 'Paid') {
    statusColor = '#a7f3d0';
    statusBg = 'rgba(16, 185, 129, 0.1)';
  } else if (bill?.payment_status === 'Partially Paid') {
    statusColor = '#fed7aa';
    statusBg = 'rgba(249, 115, 22, 0.1)';
  } else if (bill?.payment_status === 'Unpaid') {
    statusColor = '#fca5a5';
    statusBg = 'rgba(239, 68, 68, 0.1)';
  }

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

          /* Conditional printing structures */
          .print-bill-invoice-slip {
            display: ${printType === 'bill' ? 'block' : 'none'} !important;
            width: 100% !important;
            font-family: 'Outfit', 'Inter', sans-serif !important;
            color: #000000 !important;
            padding: 1.5cm !important;
            background: #ffffff !important;
          }

          .print-cash-receipt-slip {
            display: ${printType === 'receipt' ? 'block' : 'none'} !important;
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

          .print-totals-box {
            width: 300px !important;
            float: right !important;
            margin-top: 1rem !important;
            font-size: 0.9rem !important;
          }

          .print-totals-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 0.35rem !important;
          }

          .print-signature-area {
            margin-top: 3cm !important;
            clear: both !important;
            display: flex !important;
            justify-content: space-between !important;
            font-size: 0.9rem !important;
          }
        }

        /* Default hidden state for print slips on desktop screens */
        .print-bill-invoice-slip, .print-cash-receipt-slip {
          display: none;
        }
      `}</style>

      {/* Action header on Desktop screen */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link 
          to={`/patients/${patientId}`} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Profile</span>
        </Link>

        {bill && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Print Bill */}
            <button 
              type="button" 
              className="btn-primary" 
              style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={handlePrintBill}
            >
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>

            {/* Record Payment (Admin/Receptionist only) */}
            {canModify && bill.payment_status !== 'Paid' && (
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: 'auto', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: 'none' }}
                onClick={() => { setShowPaymentModal(true); setPayAmount(bill.remaining_amount); }}
              >
                <PlusCircle size={16} />
                <span>Record Payment</span>
              </button>
            )}

            {/* Edit Invoice (Admin/Receptionist only) */}
            {canModify && (
              <>
                <Link 
                  to={`/patients/${patientId}/bills/edit/${bill.id}`} 
                  className="btn-secondary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Edit size={14} />
                  <span>Edit Invoice</span>
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
          <span>Loading bill ledger sheet...</span>
        </div>
      ) : error || !bill ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2>Invoice Sheet Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {error || 'The requested clinical invoice could not be located.'}
          </p>
          <Link to={`/patients/${patientId}`} className="btn-primary" style={{ width: 'auto', display: 'inline-flex', marginTop: '1.5rem' }}>
            Back to Patient Profile
          </Link>
        </div>
      ) : (
        /* Screen view layout */
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '3.2fr 1.8fr', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* Left Column: Bill Summary and Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Bill Info Card */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INVOICE FILE
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginTop: '0.1rem' }}>
                    {bill.bill_number}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Created by: <strong>{bill.creator_name}</strong> on {new Date(bill.created_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>STATUS</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: statusColor,
                      backgroundColor: statusBg,
                      border: `1px solid ${statusColor}33`
                    }}>
                      {bill.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient and Visit summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Patient Code & Name</span>
                  <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>
                    {bill.patient_name} ({bill.patient_code})
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CNIC Number</span>
                  <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>{bill.cnic}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Age / Gender</span>
                  <p style={{ fontWeight: 600, color: 'white', marginTop: '0.15rem' }}>{bill.age} yrs / {bill.gender}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consult Date & Diagnosis</span>
                  <p style={{ fontWeight: 600, color: '#10b981', marginTop: '0.15rem' }}>
                    {bill.diagnosis} ({new Date(bill.visit_date).toLocaleDateString()})
                  </p>
                </div>
              </div>
            </div>

            {/* Bill Items Grid */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Billed Services & Fees</span>
              </h3>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service / Item Name</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong style={{ color: 'white' }}>{item.item_name}</strong>
                          {item.description && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.1rem' }}>
                              {item.description}
                            </span>
                          )}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{parseFloat(item.unit_price).toLocaleString()} PKR</td>
                        <td style={{ color: parseFloat(item.discount) > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                          {parseFloat(item.discount) > 0 ? `-${parseFloat(item.discount).toLocaleString()} PKR` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'white' }}>
                          {parseFloat(item.total_amount).toLocaleString()} PKR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div style={{ 
                borderTop: '1px solid var(--glass-border)', 
                marginTop: '1.5rem', 
                paddingTop: '1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                gap: '0.5rem',
                fontSize: '0.9rem' 
              }}>
                <div style={{ width: '250px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Invoice Subtotal:</span>
                  <span style={{ color: 'white', fontWeight: 500 }}>
                    {bill.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unit_price)), 0).toLocaleString()} PKR
                  </span>
                </div>
                <div style={{ width: '250px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Discounts:</span>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                    - {bill.items.reduce((sum, item) => sum + parseFloat(item.discount), 0).toLocaleString()} PKR
                  </span>
                </div>
                <div style={{ 
                  width: '250px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  borderTop: '1px solid rgba(255,255,255,0.05)', 
                  paddingTop: '0.5rem',
                  fontSize: '1.05rem' 
                }}>
                  <strong style={{ color: 'white' }}>Grand Total:</strong>
                  <strong style={{ color: 'white' }}>{parseFloat(bill.total_amount).toLocaleString()} PKR</strong>
                </div>
              </div>
            </div>

            {/* Notes Card */}
            {bill.notes && (
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                  Invoice Notes
                </h3>
                <p style={{ color: 'white', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{bill.notes}</p>
              </div>
            )}

          </div>

          {/* Right Column: Statement balance, Payment history, Record Payment Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Account Balance Card */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <CreditCard size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Account Balance</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Invoice Grand Total:</span>
                  <strong style={{ color: 'white' }}>{parseFloat(bill.total_amount).toLocaleString()} PKR</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Received:</span>
                  <strong style={{ color: '#10b981' }}>{parseFloat(bill.amount_paid).toLocaleString()} PKR</strong>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  borderTop: '1px solid rgba(255,255,255,0.05)', 
                  paddingTop: '0.75rem',
                  fontSize: '1.05rem' 
                }}>
                  <span style={{ color: 'white', fontWeight: 600 }}>Remaining Balance:</span>
                  <strong style={{ 
                    color: parseFloat(bill.remaining_amount) > 0 ? 'var(--color-danger)' : '#10b981',
                    fontSize: '1.2rem' 
                  }}>
                    {parseFloat(bill.remaining_amount).toLocaleString()} PKR
                  </strong>
                </div>
              </div>

              {bill.payment_status === 'Paid' && (
                <div style={{ 
                  marginTop: '1.25rem', 
                  padding: '0.5rem', 
                  borderRadius: '4px', 
                  background: 'rgba(16,185,129,0.05)', 
                  border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#a7f3d0',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  <CheckCircle2 size={16} />
                  <span>Account Fully Settled</span>
                </div>
              )}
            </div>

            {/* Record Payment Modal / Inline Form */}
            {showPaymentModal && (
              <div className="glass-card" style={{ border: '1px solid var(--color-primary)', background: 'var(--card-bg)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>Record Cash/Electronic Payment</span>
                </h3>
                
                <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Amount */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Amount to Pay (PKR) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      disabled={payLoading}
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Payment Method *</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      disabled={payLoading}
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="Easypaisa">Easypaisa</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Ref */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Transaction Reference / ID</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '0.5rem', padding: '0.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. TRX-1234567"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      disabled={payLoading}
                    />
                  </div>

                  {payError && (
                    <div className="alert alert-danger" style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center', margin: 0 }}>
                      <AlertCircle size={14} />
                      <span>{payError}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={() => setShowPaymentModal(false)}
                      disabled={payLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      disabled={payLoading || !payAmount}
                    >
                      {payLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                      <span>Submit Payment</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Payment History Card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} style={{ color: 'var(--color-success)' }} />
                <span>Payment History Log</span>
              </h3>

              {bill.payments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No payment transactions logged for this invoice.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {bill.payments.map((pay) => (
                    <div 
                      key={pay.id} 
                      style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--glass-border)', 
                        padding: '0.85rem', 
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ color: 'white', fontSize: '0.9rem' }}>
                            {parseFloat(pay.amount_paid).toLocaleString()} PKR
                          </strong>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '1px 4px', 
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            color: '#a7f3d0',
                            marginLeft: '0.4rem'
                          }}>
                            {pay.payment_method}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          onClick={() => handlePrintReceipt(pay)}
                        >
                          <Printer size={12} />
                          <span>Receipt</span>
                        </button>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>Receipt: <strong>{pay.receipt_number}</strong></span>
                        {pay.transaction_reference && (
                          <span>Ref: <strong>{pay.transaction_reference}</strong></span>
                        )}
                        <span>Date: {new Date(pay.payment_date).toLocaleDateString()} at {new Date(pay.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Received by: {pay.receiver_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* DUAL PRINT CONTAINER: SCREEN INVISIBLE, PRINT ONLY */}
      {bill && (
        <>
          {/* 1. PRINT LAYOUT: EXECUTIVE SINGLE PAGE MEDICAL INVOICE */}
          <div className="print-bill-invoice-slip">
            
            {/* Header / Branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  CLINIC MANAGEMENT SYSTEM
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, marginTop: '0.1rem' }}>
                  General Medical Consultation & Clinical Billing Services
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Main Clinic Complex, Sector 4, Healthcare Ave | Helpline: +92 300 1234567 | Billing Desk
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>
                  INVOICE
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', display: 'block', marginTop: '0.1rem' }}>
                  {bill.bill_number}
                </span>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  marginTop: '0.3rem',
                  border: '1px solid #0f172a',
                  background: bill.payment_status === 'Paid' ? '#dcfce7' : bill.payment_status === 'Partially Paid' ? '#ffedd5' : '#fee2e2',
                  color: bill.payment_status === 'Paid' ? '#15803d' : bill.payment_status === 'Partially Paid' ? '#c2410c' : '#b91c1c'
                }}>
                  STATUS: {bill.payment_status}
                </span>
              </div>
            </div>

            {/* 2-Column Details Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem', marginBottom: '0.9rem' }}>
              
              {/* Bill To / Patient Box */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.6rem 0.8rem', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.4rem' }}>
                  PATIENT INFORMATION (BILL TO)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: '0.25rem', fontSize: '0.8rem', color: '#0f172a' }}>
                  <strong>Name:</strong> <span><strong>{bill.patient_name}</strong></span>
                  <strong>Patient ID:</strong> <span>{bill.patient_code}</span>
                  <strong>Age / Sex:</strong> <span>{bill.age} Yrs / {bill.gender}</span>
                  <strong>CNIC #:</strong> <span>{bill.cnic || 'N/A'}</span>
                  <strong>Address:</strong> <span>{bill.address || 'N/A'}</span>
                </div>
              </div>

              {/* Clinical Consultation Details Box */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.6rem 0.8rem', background: '#f8fafc' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem', marginBottom: '0.4rem' }}>
                  CLINICAL & CONSULTATION DETAILS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', rowGap: '0.25rem', fontSize: '0.8rem', color: '#0f172a' }}>
                  <strong>Invoice Date:</strong> <span>{new Date(bill.created_at).toLocaleDateString()}</span>
                  <strong>Visit Date:</strong> <span>{new Date(bill.visit_date).toLocaleDateString()}</span>
                  <strong>Attending Dr:</strong> <span><strong>Dr. {bill.creator_name}</strong></span>
                  <strong>Diagnosis:</strong> <span>{bill.diagnosis || 'General Clinical Consultation'}</span>
                </div>
              </div>

            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Itemized Services & Medical Charges:
            </div>

            {/* Services Table */}
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.9rem', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', fontWeight: 700, width: '35px' }}>#</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left', fontWeight: 700 }}>SERVICE / ITEM DESCRIPTION</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: 700, width: '50px' }}>QTY</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700, width: '100px' }}>UNIT PRICE</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700, width: '90px' }}>DISCOUNT</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700, width: '110px' }}>TOTAL (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <strong style={{ color: '#0f172a' }}>{item.item_name}</strong>
                      {item.description && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.05rem' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right' }}>{parseFloat(item.unit_price).toLocaleString()}</td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', color: parseFloat(item.discount) > 0 ? '#b91c1c' : '#64748b' }}>
                      {parseFloat(item.discount) > 0 ? `-${parseFloat(item.discount).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {parseFloat(item.total_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary & Notice Footer Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '1rem', alignItems: 'flex-start' }}>
              
              {/* Left Notice Box */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0.6rem 0.8rem', background: '#f8fafc', fontSize: '0.75rem', color: '#475569' }}>
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '0.2rem', fontSize: '0.78rem' }}>
                  Payment Terms & Notes:
                </strong>
                <p style={{ margin: 0, lineHeight: '1.4' }}>
                  {bill.notes ? bill.notes : 'Official receipt issued upon payment. Please retain this invoice for your medical records.'}
                </p>
                <div style={{ marginTop: '0.4rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem', fontSize: '0.72rem', color: '#64748b' }}>
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} by Clinic System.
                </div>
              </div>

              {/* Right Totals Box */}
              <div style={{ border: '1.5px solid #0f172a', borderRadius: '4px', padding: '0.5rem 0.75rem', background: '#ffffff', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: '#475569' }}>Subtotal:</span>
                  <span>{bill.items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unit_price)), 0).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', marginBottom: '0.25rem' }}>
                  <span>Total Discount:</span>
                  <span>- {bill.items.reduce((sum, item) => sum + parseFloat(item.discount), 0).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #0f172a', paddingTop: '0.3rem', marginBottom: '0.25rem', fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                  <span>GRAND TOTAL:</span>
                  <span>{parseFloat(bill.total_amount).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', marginBottom: '0.25rem', fontWeight: 600 }}>
                  <span>Amount Paid:</span>
                  <span>{parseFloat(bill.amount_paid).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem', fontWeight: 900, fontSize: '0.85rem', color: parseFloat(bill.remaining_amount) > 0 ? '#b91c1c' : '#15803d' }}>
                  <span>BALANCE DUE:</span>
                  <span>{parseFloat(bill.remaining_amount).toLocaleString()} PKR</span>
                </div>
              </div>

            </div>

            {/* Signature Area */}
            <div style={{ marginTop: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ width: '190px', textAlign: 'center', fontSize: '0.75rem', color: '#0f172a' }}>
                <div style={{ borderBottom: '1.5px solid #0f172a', height: '1.1cm', marginBottom: '0.3rem' }}></div>
                <strong>Patient / Receiver Signature</strong>
              </div>
              <div style={{ width: '190px', textAlign: 'center', fontSize: '0.75rem', color: '#0f172a' }}>
                <div style={{ borderBottom: '1.5px solid #0f172a', height: '1.1cm', marginBottom: '0.3rem' }}></div>
                <strong>Authorized Cashier / Stamp</strong>
              </div>
            </div>

          </div>

          {/* 2. PRINT LAYOUT: PAYMENT RECEIPT */}
          {activeReceipt && (
            <div className="print-cash-receipt-slip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px dashed #0f172a', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                    CLINIC MANAGEMENT SYSTEM
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Official Payment Receipt</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#15803d', display: 'block' }}>RECEIPT</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{activeReceipt.receipt_number}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div>
                  <p style={{ margin: '0 0 0.2rem 0' }}><strong>Invoice Ref:</strong> {bill.bill_number}</p>
                  <p style={{ margin: '0 0 0.2rem 0' }}><strong>Payment Date:</strong> {new Date(activeReceipt.payment_date).toLocaleString()}</p>
                  <p style={{ margin: 0 }}><strong>Payment Method:</strong> {activeReceipt.payment_method}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 0.2rem 0' }}><strong>Patient:</strong> {bill.patient_name} ({bill.patient_code})</p>
                  <p style={{ margin: '0 0 0.2rem 0' }}><strong>CNIC:</strong> {bill.cnic || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Received By:</strong> {activeReceipt.receiver_name}</p>
                </div>
              </div>

              <div style={{ border: '2px solid #0f172a', padding: '0.8rem', margin: '0.8rem 0', borderRadius: '4px', textAlign: 'center', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>AMOUNT RECEIVED</span>
                <strong style={{ fontSize: '1.8rem', color: '#0f172a', display: 'block', margin: '0.2rem 0' }}>
                  {parseFloat(activeReceipt.amount_paid).toLocaleString()} PKR
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
                  Received with thanks for medical consultation services.
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '220px', marginLeft: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Invoice Total:</span>
                  <span>{parseFloat(bill.total_amount).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                  <span>Total Received:</span>
                  <span>{parseFloat(bill.amount_paid).toLocaleString()} PKR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #0f172a', paddingTop: '0.25rem', fontWeight: 800 }}>
                  <span>Remaining Balance:</span>
                  <span>{parseFloat(bill.remaining_amount).toLocaleString()} PKR</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ width: '180px', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div style={{ borderBottom: '1px dashed #0f172a', marginBottom: '0.2rem', height: '1cm' }}></div>
                  <strong>Payer Signature</strong>
                </div>
                <div style={{ width: '180px', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div style={{ borderBottom: '1px dashed #0f172a', marginBottom: '0.2rem', height: '1cm' }}></div>
                  <strong>Authorized Cashier</strong>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{activeReceipt.receiver_name}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default BillDetails;
