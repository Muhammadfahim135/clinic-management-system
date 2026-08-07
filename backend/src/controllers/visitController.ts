import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditAction } from '../utils/audit';

/**
 * Helper to check if a user ID is a valid doctor
 */
async function isValidDoctor(doctorId: string): Promise<boolean> {
  try {
    const res = await query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND r.name = 'Doctor' AND u.is_active = TRUE`,
      [doctorId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Record a new patient visit
 * POST /api/patients/:id/visits
 */
export const addVisit = async (req: AuthenticatedRequest, res: Response) => {
  const { id: patientId } = req.params;
  const {
    doctorId,
    visitDate,
    chiefComplaint,
    diagnosis,
    bloodPressure,
    weightKg,
    temperatureF,
    doctorNotes,
    followUpDate,
  } = req.body;

  // 1. Validations
  if (!doctorId || !chiefComplaint || !diagnosis) {
    return res.status(400).json({
      success: false,
      message: 'Doctor, Chief Complaint / Symptoms, and Diagnosis are required.',
    });
  }

  try {
    // 2. Verify patient exists
    const patientCheck = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // 3. Verify doctor is valid
    const doctorOk = await isValidDoctor(doctorId);
    if (!doctorOk) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor assignment. Assigned doctor must be active and hold the Doctor role.',
      });
    }

    // 4. Insert Visit
    const visitRes = await query(
      `INSERT INTO visits (
        patient_id, doctor_id, visit_date, chief_complaint, diagnosis,
        blood_pressure, weight_kg, temperature_f, doctor_notes, follow_up_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, patient_id, doctor_id, visit_date, chief_complaint, diagnosis`,
      [
        patientId,
        doctorId,
        visitDate ? new Date(visitDate) : new Date(),
        chiefComplaint.trim(),
        diagnosis.trim(),
        bloodPressure ? bloodPressure.trim() : null,
        weightKg ? parseFloat(weightKg) : null,
        temperatureF ? parseFloat(temperatureF) : null,
        doctorNotes ? doctorNotes.trim() : null,
        followUpDate ? followUpDate : null,
      ]
    );

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Visit Logged', patientId, { visit_id: visitRes.rows[0].id });
    }

    return res.status(201).json({
      success: true,
      message: 'Patient visit recorded successfully.',
      visit: visitRes.rows[0],
    });
  } catch (error) {
    console.error('addVisit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record patient visit.',
    });
  }
};

/**
 * Update an existing patient visit
 * PUT /api/visits/:visitId
 */
export const updateVisit = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;
  const {
    doctorId,
    visitDate,
    chiefComplaint,
    diagnosis,
    bloodPressure,
    weightKg,
    temperatureF,
    doctorNotes,
    followUpDate,
  } = req.body;

  if (!doctorId || !chiefComplaint || !diagnosis) {
    return res.status(400).json({
      success: false,
      message: 'Doctor, Chief Complaint / Symptoms, and Diagnosis are required.',
    });
  }

  try {
    // 1. Verify visit exists and is not soft deleted
    const visitCheck = await query('SELECT id FROM visits WHERE id = $1 AND is_deleted = FALSE', [visitId]);
    if ((visitCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visit record not found.',
      });
    }

    // 2. Verify doctor is valid
    const doctorOk = await isValidDoctor(doctorId);
    if (!doctorOk) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor assignment.',
      });
    }

    // 3. Update Visit
    await query(
      `UPDATE visits
       SET doctor_id = $1, visit_date = $2, chief_complaint = $3, diagnosis = $4,
           blood_pressure = $5, weight_kg = $6, temperature_f = $7, doctor_notes = $8,
           follow_up_date = $9
       WHERE id = $10 AND is_deleted = FALSE`,
      [
        doctorId,
        visitDate ? new Date(visitDate) : new Date(),
        chiefComplaint.trim(),
        diagnosis.trim(),
        bloodPressure ? bloodPressure.trim() : null,
        weightKg ? parseFloat(weightKg) : null,
        temperatureF ? parseFloat(temperatureF) : null,
        doctorNotes ? doctorNotes.trim() : null,
        followUpDate ? followUpDate : null,
        visitId,
      ]
    );

    const visitRes2 = await query('SELECT patient_id FROM visits WHERE id = $1', [visitId]);
    const pId = visitRes2.rows[0]?.patient_id;
    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Visit Updated', pId, { visit_id: visitId });
    }

    return res.status(200).json({
      success: true,
      message: 'Patient visit record updated successfully.',
    });
  } catch (error) {
    console.error('updateVisit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update patient visit record.',
    });
  }
};

/**
 * Get details for a specific visit
 * GET /api/visits/:visitId
 */
export const getVisitDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;

  try {
    const visitRes = await query(
      `SELECT v.*, p.name as patient_name, p.patient_code, u.name as doctor_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN users u ON v.doctor_id = u.id
       WHERE v.id = $1 AND v.is_deleted = FALSE`,
      [visitId]
    );

    if ((visitRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visit record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      visit: visitRes.rows[0],
    });
  } catch (error) {
    console.error('getVisitDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve visit details.',
    });
  }
};

/**
 * Get all visits for a patient (latest first)
 * GET /api/patients/:id/visits
 */
export const getPatientVisits = async (req: AuthenticatedRequest, res: Response) => {
  const { id: patientId } = req.params;

  try {
    // Verify patient exists
    const patientCheck = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const visitsRes = await query(
      `SELECT v.*, u.name as doctor_name
       FROM visits v
       JOIN users u ON v.doctor_id = u.id
       WHERE v.patient_id = $1 AND v.is_deleted = FALSE
       ORDER BY v.visit_date DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      visits: visitsRes.rows,
    });
  } catch (error) {
    console.error('getPatientVisits error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient visits.',
    });
  }
};

/**
 * Soft delete a patient visit
 * DELETE /api/visits/:visitId
 */
export const deleteVisit = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;

  try {
    const visitCheck = await query('SELECT id FROM visits WHERE id = $1 AND is_deleted = FALSE', [visitId]);
    if ((visitCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Visit record not found.',
      });
    }

    await query(
      `UPDATE visits 
       SET is_deleted = TRUE 
       WHERE id = $1`,
      [visitId]
    );

    const visitRes2 = await query('SELECT patient_id FROM visits WHERE id = $1', [visitId]);
    const pId = visitRes2.rows[0]?.patient_id;
    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Visit Deleted', pId, { visit_id: visitId });
    }

    return res.status(200).json({
      success: true,
      message: 'Patient visit record soft-deleted successfully.',
    });
  } catch (error) {
    console.error('deleteVisit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete visit record.',
    });
  }
};

/**
 * Get structured patient timeline
 * GET /api/patients/:id/timeline
 */
export const getPatientTimeline = async (req: AuthenticatedRequest, res: Response) => {
  const { id: patientId } = req.params;

  try {
    // 1. Verify patient
    const patientCheck = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // 2. Fetch active visits chronologically ASC to calculate visit numbers
    const visitsRes = await query(
      `SELECT v.id, v.visit_date, v.chief_complaint, v.diagnosis, v.follow_up_date, v.doctor_notes,
              v.blood_pressure, v.weight_kg, v.temperature_f, u.name as doctor_name
       FROM visits v
       JOIN users u ON v.doctor_id = u.id
       WHERE v.patient_id = $1 AND v.is_deleted = FALSE
       ORDER BY v.visit_date ASC`,
      [patientId]
    );

    // 3. Map visits with Visit Number and sort DESC (latest first)
    const timelineEvents = visitsRes.rows.map((row, index) => ({
      visitNumber: index + 1,
      id: row.id,
      visitDate: row.visit_date,
      doctorName: row.doctor_name,
      chiefComplaint: row.chief_complaint,
      diagnosis: row.diagnosis,
      followUpDate: row.follow_up_date,
      doctorNotes: row.doctor_notes,
      bloodPressure: row.blood_pressure,
      weightKg: row.weight_kg,
      temperatureF: row.temperature_f,
    })).reverse(); // latest first

    // 4. Extract metrics trend for doctors' reviews
    const vitalsTrend = visitsRes.rows
      .filter(row => row.weight_kg || row.temperature_f || row.blood_pressure)
      .map(row => ({
        date: row.visit_date,
        bp: row.blood_pressure,
        weight: row.weight_kg,
        temp: row.temperature_f,
      }));

    return res.status(200).json({
      success: true,
      timeline: timelineEvents,
      vitalsTrend,
    });
  } catch (error) {
    console.error('getPatientTimeline error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient clinical timeline.',
    });
  }
};
