import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/db';
import { logAuditAction } from '../utils/audit';

interface BillItemInput {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

/**
 * Helper to validate a bill item
 */
function validateBillItem(item: any): string | null {
  if (!item.itemName || !item.itemName.trim()) {
    return 'Item Name cannot be empty.';
  }
  const qty = parseInt(item.quantity);
  const price = parseFloat(item.unitPrice);
  const disc = parseFloat(item.discount || '0');

  if (isNaN(qty) || qty <= 0) {
    return `Quantity for item "${item.itemName}" must be a positive integer.`;
  }
  if (isNaN(price) || price < 0) {
    return `Unit price for item "${item.itemName}" must be a non-negative number.`;
  }
  if (isNaN(disc) || disc < 0) {
    return `Discount for item "${item.itemName}" must be a non-negative number.`;
  }
  if (disc > (qty * price)) {
    return `Discount for item "${item.itemName}" cannot exceed the item subtotal (${qty * price} PKR).`;
  }
  return null;
}

/**
 * Create a new bill
 * POST /api/bills
 */
export const createBill = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, visitId, items, notes } = req.body;

  // 1. Validations
  if (!patientId) {
    return res.status(400).json({ success: false, message: 'Patient ID is required.' });
  }
  if (!visitId) {
    return res.status(400).json({ success: false, message: 'Visit ID is required.' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one bill item is required.' });
  }

  for (const item of items) {
    const errorMsg = validateBillItem(item);
    if (errorMsg) {
      return res.status(400).json({ success: false, message: errorMsg });
    }
  }

  const client = await pool.connect();
  try {
    // Check if patient and visit exist
    const patientCheck = await client.query('SELECT id FROM patients WHERE id = $1', [patientId]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Patient record not found.' });
    }

    const visitCheck = await client.query('SELECT id FROM visits WHERE id = $1 AND is_deleted = FALSE', [visitId]);
    if ((visitCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    await client.query('BEGIN');

    // Calculate totals
    let totalAmount = 0;
    const itemsWithTotals = items.map((item: BillItemInput) => {
      const qty = parseInt(item.quantity as any);
      const price = parseFloat(item.unitPrice as any);
      const disc = parseFloat((item.discount || 0) as any);
      const itemTotal = (qty * price) - disc;
      totalAmount += itemTotal;
      return { ...item, quantity: qty, unitPrice: price, discount: disc, totalAmount: itemTotal };
    });

    // Create bill row
    const billRes = await client.query(
      `INSERT INTO bills (patient_id, visit_id, total_amount, amount_paid, remaining_amount, payment_status, notes, created_by)
       VALUES ($1, $2, $3, 0.00, $3, 'Unpaid', $4, $5)
       RETURNING id, bill_number, total_amount, remaining_amount, payment_status, created_at`,
      [
        patientId,
        visitId,
        totalAmount,
        notes ? notes.trim() : null,
        req.user?.userId
      ]
    );

    const billId = billRes.rows[0].id;

    // Insert bill items
    for (const item of itemsWithTotals) {
      await client.query(
        `INSERT INTO bill_items (bill_id, item_name, description, quantity, unit_price, discount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          billId,
          item.itemName.trim(),
          item.description ? item.description.trim() : null,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.totalAmount
        ]
      );
    }

    await client.query('COMMIT');

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Bill Created', patientId, { bill_id: billId, bill_number: billRes.rows[0].bill_number });
    }

    return res.status(201).json({
      success: true,
      message: 'Bill invoice created successfully.',
      bill: billRes.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createBill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate bill.' });
  } finally {
    client.release();
  }
};

/**
 * Update an existing bill
 * PUT /api/bills/:id
 */
export const updateBill = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { items, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'At least one bill item is required.' });
  }

  for (const item of items) {
    const errorMsg = validateBillItem(item);
    if (errorMsg) {
      return res.status(400).json({ success: false, message: errorMsg });
    }
  }

  const client = await pool.connect();
  try {
    // Get existing bill to verify amount_paid limits
    const billCheck = await client.query(
      'SELECT id, amount_paid, is_deleted FROM bills WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    if ((billCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Bill invoice not found.' });
    }

    const amountPaid = parseFloat(billCheck.rows[0].amount_paid);

    await client.query('BEGIN');

    // Calculate new total amount
    let totalAmount = 0;
    const itemsWithTotals = items.map((item: BillItemInput) => {
      const qty = parseInt(item.quantity as any);
      const price = parseFloat(item.unitPrice as any);
      const disc = parseFloat((item.discount || 0) as any);
      const itemTotal = (qty * price) - disc;
      totalAmount += itemTotal;
      return { ...item, quantity: qty, unitPrice: price, discount: disc, totalAmount: itemTotal };
    });

    if (totalAmount < amountPaid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot update bill. New total amount (${totalAmount} PKR) cannot be less than the amount already paid (${amountPaid} PKR).`
      });
    }

    const remainingAmount = totalAmount - amountPaid;
    let paymentStatus = 'Unpaid';
    if (remainingAmount === 0) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    // Delete old items
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [id]);

    // Insert new items
    for (const item of itemsWithTotals) {
      await client.query(
        `INSERT INTO bill_items (bill_id, item_name, description, quantity, unit_price, discount, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          item.itemName.trim(),
          item.description ? item.description.trim() : null,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.totalAmount
        ]
      );
    }

    // Update bill record
    await client.query(
      `UPDATE bills 
       SET total_amount = $1, remaining_amount = $2, payment_status = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [totalAmount, remainingAmount, paymentStatus, notes ? notes.trim() : null, id]
    );

    await client.query('COMMIT');

    const billDetailsRes = await client.query('SELECT patient_id FROM bills WHERE id = $1', [id]);
    const pId = billDetailsRes.rows[0]?.patient_id;
    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Bill Updated', pId, { bill_id: id });
    }

    return res.status(200).json({
      success: true,
      message: 'Bill invoice updated successfully.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateBill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update bill.' });
  } finally {
    client.release();
  }
};

/**
 * Fetch detailed bill sheet
 * GET /api/bills/:id
 */
export const getBillDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const billRes = await query(
      `SELECT b.*, 
              p.name as patient_name, p.patient_code, p.date_of_birth, p.gender, p.age, p.cnic, p.address,
              v.visit_date, v.diagnosis,
              u.name as creator_name
       FROM bills b
       JOIN patients p ON b.patient_id = p.id
       JOIN visits v ON b.visit_id = v.id
       JOIN users u ON b.created_by = u.id
       WHERE b.id = $1 AND b.is_deleted = FALSE`,
      [id]
    );

    if ((billRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Bill details sheet not found.' });
    }

    const billItemsRes = await query(
      'SELECT id, item_name, description, quantity, unit_price, discount, total_amount FROM bill_items WHERE bill_id = $1',
      [id]
    );

    const paymentsRes = await query(
      `SELECT pay.*, u.name as receiver_name 
       FROM payments pay
       JOIN users u ON pay.received_by = u.id
       WHERE pay.bill_id = $1
       ORDER BY pay.payment_date ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      bill: {
        ...billRes.rows[0],
        items: billItemsRes.rows,
        payments: paymentsRes.rows
      }
    });

  } catch (error) {
    console.error('getBillDetails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve bill details.' });
  }
};

/**
 * Fetch all bills for a patient
 * GET /api/patients/:patientId/bills
 */
export const getPatientBills = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;

  try {
    const billsRes = await query(
      `SELECT b.*, 
              v.visit_date, v.diagnosis,
              u.name as creator_name
       FROM bills b
       JOIN visits v ON b.visit_id = v.id
       JOIN users u ON b.created_by = u.id
       WHERE b.patient_id = $1 AND b.is_deleted = FALSE
       ORDER BY b.created_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      bills: billsRes.rows
    });
  } catch (error) {
    console.error('getPatientBills error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patient billing history.' });
  }
};

/**
 * Add a single item to an existing bill
 * POST /api/bills/:id/items
 */
export const addBillItem = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { itemName, description, quantity, unitPrice, discount } = req.body;

  const errorMsg = validateBillItem({ itemName, quantity, unitPrice, discount });
  if (errorMsg) {
    return res.status(400).json({ success: false, message: errorMsg });
  }

  const client = await pool.connect();
  try {
    const billCheck = await client.query(
      'SELECT id, total_amount, amount_paid, is_deleted FROM bills WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    if ((billCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Bill invoice not found.' });
    }

    const bill = billCheck.rows[0];
    const qty = parseInt(quantity as any);
    const price = parseFloat(unitPrice as any);
    const disc = parseFloat((discount || 0) as any);
    const itemTotal = (qty * price) - disc;

    await client.query('BEGIN');

    // Insert new item
    await client.query(
      `INSERT INTO bill_items (bill_id, item_name, description, quantity, unit_price, discount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, itemName.trim(), description ? description.trim() : null, qty, price, disc, itemTotal]
    );

    // Update bill totals
    const newTotal = parseFloat(bill.total_amount) + itemTotal;
    const amountPaid = parseFloat(bill.amount_paid);
    const newRemaining = newTotal - amountPaid;
    let paymentStatus = 'Unpaid';
    if (newRemaining === 0) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    await client.query(
      `UPDATE bills 
       SET total_amount = $1, remaining_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newTotal, newRemaining, paymentStatus, id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Item added to bill successfully.',
      itemTotal
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('addBillItem error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add item to bill.' });
  } finally {
    client.release();
  }
};

/**
 * Record a payment against a bill
 * POST /api/bills/:id/payments
 */
export const recordPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amountPaid, paymentMethod, transactionReference } = req.body;

  const paymentAmount = parseFloat(amountPaid);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Payment amount must be a positive number.' });
  }

  const validMethods = ['Cash', 'Easypaisa', 'JazzCash', 'Bank Transfer'];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: `Payment method must be one of: ${validMethods.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    const billCheck = await client.query(
      'SELECT id, amount_paid, remaining_amount, total_amount, is_deleted FROM bills WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((billCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Bill invoice not found.' });
    }

    const bill = billCheck.rows[0];
    const remainingBalance = parseFloat(bill.remaining_amount);

    if (paymentAmount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount} PKR) cannot exceed remaining balance (${remainingBalance} PKR).`
      });
    }

    await client.query('BEGIN');

    // Insert payment row
    const payRes = await client.query(
      `INSERT INTO payments (bill_id, amount_paid, payment_method, transaction_reference, received_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, receipt_number, amount_paid, payment_method, payment_date`,
      [
        id,
        paymentAmount,
        paymentMethod,
        transactionReference ? transactionReference.trim() : null,
        req.user?.userId
      ]
    );

    // Update bill table
    const newAmountPaid = parseFloat(bill.amount_paid) + paymentAmount;
    const newRemainingAmount = remainingBalance - paymentAmount;
    const newStatus = newRemainingAmount === 0 ? 'Paid' : 'Partially Paid';

    await client.query(
      `UPDATE bills 
       SET amount_paid = $1, remaining_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newAmountPaid, newRemainingAmount, newStatus, id]
    );

    await client.query('COMMIT');

    const billDetailsRes = await client.query('SELECT patient_id FROM bills WHERE id = $1', [id]);
    const pId = billDetailsRes.rows[0]?.patient_id;
    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Payment Recorded', pId, { bill_id: id, amount: paymentAmount });
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      payment: payRes.rows[0],
      billStatus: {
        amountPaid: newAmountPaid,
        remainingAmount: newRemainingAmount,
        paymentStatus: newStatus
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('recordPayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  } finally {
    client.release();
  }
};

/**
 * Fetch payment history for a specific bill
 * GET /api/bills/:id/payments
 */
export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const paymentsRes = await query(
      `SELECT pay.*, u.name as receiver_name 
       FROM payments pay
       JOIN users u ON pay.received_by = u.id
       WHERE pay.bill_id = $1
       ORDER BY pay.payment_date DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      payments: paymentsRes.rows
    });
  } catch (error) {
    console.error('getPaymentHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment history.' });
  }
};

/**
 * Soft delete a bill
 * DELETE /api/bills/:id
 */
export const deleteBill = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const checkRes = await query('SELECT id FROM bills WHERE id = $1 AND is_deleted = FALSE', [id]);
    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Bill invoice not found.' });
    }

    await query('UPDATE bills SET is_deleted = TRUE WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'Bill invoice soft-deleted successfully.'
    });
  } catch (error) {
    console.error('deleteBill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete bill.' });
  }
};

/**
 * Get all bills in the system (global search/listing)
 * GET /api/bills
 */
export const getGlobalBills = async (req: AuthenticatedRequest, res: Response) => {
  const { search, status } = req.query;

  try {
    let queryText = `
      SELECT b.*, 
             p.name as patient_name, p.patient_code,
             v.visit_date, v.diagnosis,
             u.name as creator_name
      FROM bills b
      JOIN patients p ON b.patient_id = p.id
      JOIN visits v ON b.visit_id = v.id
      JOIN users u ON b.created_by = u.id
      WHERE b.is_deleted = FALSE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search && typeof search === 'string' && search.trim() !== '') {
      queryText += ` AND (p.name ILIKE $${paramIndex} OR p.patient_code ILIKE $${paramIndex} OR b.bill_number ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (status && typeof status === 'string' && status.trim() !== '') {
      queryText += ` AND b.payment_status = $${paramIndex}`;
      params.push(status.trim());
      paramIndex++;
    }

    queryText += ` ORDER BY b.created_at DESC`;

    const billsRes = await query(queryText, params);

    return res.status(200).json({
      success: true,
      bills: billsRes.rows
    });

  } catch (error) {
    console.error('getGlobalBills error:', error);
    return res.status(500).json({ success: false, message: 'Failed to compile bills registry.' });
  }
};

/**
 * Fetch bill invoice linked to a specific visit
 * GET /api/bills/visit/:visitId
 */
export const getVisitBill = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;

  try {
    const billRes = await query(
      `SELECT b.*, u.name as creator_name
       FROM bills b
       JOIN users u ON b.created_by = u.id
       WHERE b.visit_id = $1 AND b.is_deleted = FALSE
       LIMIT 1`,
      [visitId]
    );

    return res.status(200).json({
      success: true,
      bill: billRes.rowCount && billRes.rowCount > 0 ? billRes.rows[0] : null
    });
  } catch (error) {
    console.error('getVisitBill error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve visit bill.' });
  }
};
