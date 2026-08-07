import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/db';

interface MedicineItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

/**
 * Helper to validate a medicine item
 */
function validateMedicineItem(item: any): string | null {
  if (!item.medicineName || !item.medicineName.trim()) {
    return 'Medicine Name cannot be empty.';
  }
  if (!item.dosage || !item.dosage.trim()) {
    return `Dosage is required for medicine "${item.medicineName}".`;
  }
  if (!item.frequency || !item.frequency.trim()) {
    return `Frequency is required for medicine "${item.medicineName}".`;
  }
  if (!item.duration || !item.duration.trim()) {
    return `Duration is required for medicine "${item.medicineName}".`;
  }
  return null;
}

/**
 * Create a new prescription
 * POST /api/prescriptions
 */
export const createPrescription = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId, instructions, items } = req.body;

  // 1. Core validations
  if (!visitId) {
    return res.status(400).json({ success: false, message: 'Visit ID is required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one medicine item is required in a prescription.',
    });
  }

  // Validate all medicine items
  for (const item of items) {
    const errorMsg = validateMedicineItem(item);
    if (errorMsg) {
      return res.status(400).json({ success: false, message: errorMsg });
    }
  }

  const client = await pool.connect();
  try {
    // 2. Verify visit exists and is active
    const visitCheck = await client.query(
      'SELECT id, doctor_id FROM visits WHERE id = $1 AND is_deleted = FALSE',
      [visitId]
    );

    if ((visitCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Attending consult visit sheet not found.' });
    }

    // 3. Start transaction
    await client.query('BEGIN');

    // Insert prescription row
    const prescRes = await client.query(
      `INSERT INTO prescriptions (visit_id, instructions, prescribed_by)
       VALUES ($1, $2, $3)
       RETURNING id, visit_id, instructions, prescribed_at`,
      [
        visitId,
        instructions ? instructions.trim() : null,
        req.user?.userId,
      ]
    );

    const prescriptionId = prescRes.rows[0].id;

    // Insert prescription items
    for (const item of items as MedicineItem[]) {
      await client.query(
        `INSERT INTO prescription_items (
           prescription_id, medicine_name, dosage, frequency, duration, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          prescriptionId,
          item.medicineName.trim(),
          item.dosage.trim(),
          item.frequency.trim(),
          item.duration.trim(),
          item.notes ? item.notes.trim() : null,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Prescription recorded successfully.',
      prescription: {
        ...prescRes.rows[0],
        itemCount: items.length,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createPrescription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record prescription details.',
    });
  } finally {
    client.release();
  }
};

/**
 * Update an existing prescription
 * PUT /api/prescriptions/:id
 */
export const updatePrescription = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { instructions, items } = req.body;

  // 1. Core validations
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one medicine item is required in a prescription.',
    });
  }

  // Validate items
  for (const item of items) {
    const errorMsg = validateMedicineItem(item);
    if (errorMsg) {
      return res.status(400).json({ success: false, message: errorMsg });
    }
  }

  const client = await pool.connect();
  try {
    // 2. Verify prescription exists and is active
    const checkRes = await client.query(
      'SELECT id FROM prescriptions WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Prescription record not found.' });
    }

    // 3. Start transaction
    await client.query('BEGIN');

    // Update prescription instructions
    await client.query(
      `UPDATE prescriptions
       SET instructions = $1
       WHERE id = $2 AND is_deleted = FALSE`,
      [instructions ? instructions.trim() : null, id]
    );

    // Delete existing items
    await client.query('DELETE FROM prescription_items WHERE prescription_id = $1', [id]);

    // Insert new items
    for (const item of items as MedicineItem[]) {
      await client.query(
        `INSERT INTO prescription_items (
           prescription_id, medicine_name, dosage, frequency, duration, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          item.medicineName.trim(),
          item.dosage.trim(),
          item.frequency.trim(),
          item.duration.trim(),
          item.notes ? item.notes.trim() : null,
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Prescription updated successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updatePrescription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update prescription.',
    });
  } finally {
    client.release();
  }
};

/**
 * Get detailed prescription sheet
 * GET /api/prescriptions/:id
 */
export const getPrescriptionDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Fetch prescription header details joined with patient, visit, and doctor details
    const headerRes = await query(
      `SELECT pr.*, 
              v.visit_date, v.diagnosis,
              p.id as patient_id, p.name as patient_name, p.patient_code, p.date_of_birth, p.gender, p.age, p.cnic, p.address,
              doc.name as doctor_name
       FROM prescriptions pr
       JOIN visits v ON pr.visit_id = v.id
       JOIN patients p ON v.patient_id = p.id
       JOIN users doc ON pr.prescribed_by = doc.id
       WHERE pr.id = $1 AND pr.is_deleted = FALSE AND v.is_deleted = FALSE`,
      [id]
    );

    if ((headerRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Prescription details sheet not found.' });
    }

    const prescription = headerRes.rows[0];

    // Fetch items
    const itemsRes = await query(
      `SELECT id, medicine_name, dosage, frequency, duration, notes
       FROM prescription_items
       WHERE prescription_id = $1
       ORDER BY medicine_name ASC`,
      [id]
    );

    // Format structure response
    return res.status(200).json({
      success: true,
      prescription: {
        ...prescription,
        items: itemsRes.rows,
      },
    });
  } catch (error) {
    console.error('getPrescriptionDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve prescription details.',
    });
  }
};

/**
 * Fetch all prescriptions for a patient (grouped chronologically)
 * GET /api/patients/:patientId/prescriptions
 */
export const getPatientPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;

  try {
    const prescriptionsRes = await query(
      `SELECT pr.id, pr.prescribed_at, pr.instructions,
              v.visit_date, v.diagnosis, v.id as visit_id,
              doc.name as doctor_name,
              (SELECT string_agg(medicine_name, ', ') 
               FROM prescription_items 
               WHERE prescription_id = pr.id) as medicines_summary
       FROM prescriptions pr
       JOIN visits v ON pr.visit_id = v.id
       JOIN users doc ON pr.prescribed_by = doc.id
       WHERE v.patient_id = $1 AND pr.is_deleted = FALSE AND v.is_deleted = FALSE
       ORDER BY pr.prescribed_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      prescriptions: prescriptionsRes.rows,
    });
  } catch (error) {
    console.error('getPatientPrescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient prescriptions.',
    });
  }
};

/**
 * Fetch prescriptions linked to a specific visit
 * GET /api/visits/:visitId/prescriptions
 */
export const getVisitPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;

  try {
    const prescriptionsRes = await query(
      `SELECT pr.id, pr.prescribed_at, pr.instructions,
              doc.name as doctor_name,
              (SELECT string_agg(medicine_name, ', ') 
               FROM prescription_items 
               WHERE prescription_id = pr.id) as medicines_summary
       FROM prescriptions pr
       JOIN users doc ON pr.prescribed_by = doc.id
       WHERE pr.visit_id = $1 AND pr.is_deleted = FALSE
       ORDER BY pr.prescribed_at DESC`,
      [visitId]
    );

    return res.status(200).json({
      success: true,
      prescriptions: prescriptionsRes.rows,
    });
  } catch (error) {
    console.error('getVisitPrescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve visit prescriptions.',
    });
  }
};

/**
 * Fetch all prescriptions in the system (with optional search filter)
 * GET /api/prescriptions
 */
export const getAllPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  const { search } = req.query;

  try {
    let queryText = `
      SELECT pr.id, pr.prescribed_at, pr.instructions,
             v.visit_date, v.diagnosis, v.id as visit_id,
             p.id as patient_id, p.name as patient_name, p.patient_code,
             doc.name as doctor_name,
             (SELECT string_agg(medicine_name, ', ') 
              FROM prescription_items 
              WHERE prescription_id = pr.id) as medicines_summary
      FROM prescriptions pr
      JOIN visits v ON pr.visit_id = v.id
      JOIN patients p ON v.patient_id = p.id
      JOIN users doc ON pr.prescribed_by = doc.id
      WHERE pr.is_deleted = FALSE AND v.is_deleted = FALSE
    `;
    
    const params: any[] = [];
    if (search && typeof search === 'string' && search.trim() !== '') {
      queryText += ` AND (p.name ILIKE $1 OR p.patient_code ILIKE $1 OR doc.name ILIKE $1 OR v.diagnosis ILIKE $1)`;
      params.push(`%${search.trim()}%`);
    }

    queryText += ` ORDER BY pr.prescribed_at DESC`;

    const prescriptionsRes = await query(queryText, params);

    return res.status(200).json({
      success: true,
      prescriptions: prescriptionsRes.rows,
    });
  } catch (error) {
    console.error('getAllPrescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve prescriptions.',
    });
  }
};

/**
 * Soft delete a prescription
 * DELETE /api/prescriptions/:id
 */
export const deletePrescription = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Verify exists
    const checkRes = await query(
      'SELECT id FROM prescriptions WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Prescription record not found.' });
    }

    // Soft delete prescriptions row
    await query(
      'UPDATE prescriptions SET is_deleted = TRUE WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully.',
    });
  } catch (error) {
    console.error('deletePrescription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete prescription.',
    });
  }
};
