import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to check if a patient exists
 */
async function patientExists(patientId: string): Promise<boolean> {
  try {
    const res = await query('SELECT id FROM patients WHERE id = $1', [patientId]);
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Create a new appointment
 * POST /api/appointments
 */
export const createAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, appointmentDate, appointmentTime, appointmentType, notes } = req.body;

  // 1. Validations
  if (!patientId || !appointmentDate || !appointmentTime || !appointmentType) {
    return res.status(400).json({
      success: false,
      message: 'Patient, Appointment Date, Appointment Time, and Appointment Type are required.',
    });
  }

  const validTypes = ['Walk-in', 'Scheduled'];
  if (!validTypes.includes(appointmentType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment type. Must be Walk-in or Scheduled.',
    });
  }

  try {
    // 2. Verify patient exists
    const patientOk = await patientExists(patientId);
    if (!patientOk) {
      return res.status(404).json({
        success: false,
        message: 'The selected patient record does not exist.',
      });
    }

    // 3. Insert appointment (default status is 'Scheduled')
    const insertRes = await query(
      `INSERT INTO appointments (
        patient_id, appointment_date, appointment_time, appointment_type, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, patient_id, appointment_date, appointment_time, appointment_type, status, created_at`,
      [
        patientId,
        appointmentDate, // format YYYY-MM-DD
        appointmentTime, // format HH:MM
        appointmentType,
        notes ? notes.trim() : null,
        req.user?.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointment: insertRes.rows[0],
    });
  } catch (error) {
    console.error('createAppointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to book appointment.',
    });
  }
};

/**
 * Update appointment details
 * PUT /api/appointments/:id
 */
export const updateAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { appointmentDate, appointmentTime, appointmentType, status, notes } = req.body;

  // 1. Validations
  if (!appointmentDate || !appointmentTime || !appointmentType || !status) {
    return res.status(400).json({
      success: false,
      message: 'Appointment Date, Appointment Time, Appointment Type, and Status are required.',
    });
  }

  const validTypes = ['Walk-in', 'Scheduled'];
  if (!validTypes.includes(appointmentType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment type. Must be Walk-in or Scheduled.',
    });
  }

  const validStatuses = ['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment status.',
    });
  }

  try {
    // 2. Check if appointment exists and is active
    const checkRes = await query(
      'SELECT id FROM appointments WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment record not found.',
      });
    }

    // 3. Update appointment
    await query(
      `UPDATE appointments
       SET appointment_date = $1, appointment_time = $2, appointment_type = $3, status = $4, notes = $5
       WHERE id = $6 AND is_deleted = FALSE`,
      [
        appointmentDate,
        appointmentTime,
        appointmentType,
        status,
        notes ? notes.trim() : null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment details updated successfully.',
    });
  } catch (error) {
    console.error('updateAppointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment.',
    });
  }
};

/**
 * Get detailed appointment information
 * GET /api/appointments/:id
 */
export const getAppointmentDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const detailsRes = await query(
      `SELECT a.*, 
              p.name as patient_name, p.patient_code, p.father_name, p.gender, p.age, p.cnic,
              u.name as creator_name,
              d.name as doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.created_by = u.id
       JOIN users d ON p.assigned_doctor_id = d.id
       WHERE a.id = $1 AND a.is_deleted = FALSE`,
      [id]
    );

    if ((detailsRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    const appointment = detailsRes.rows[0];

    // If user is Doctor, enforce they can only view if patient is assigned to them
    if (req.user?.role === 'Doctor' && appointment.doctor_id !== req.user?.userId) {
      // Find out if the patient is actually assigned to this doctor
      const checkDoctorAssign = await query(
        'SELECT assigned_doctor_id FROM patients WHERE id = $1',
        [appointment.patient_id]
      );
      if (checkDoctorAssign.rows[0]?.assigned_doctor_id !== req.user?.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are only authorized to view appointments for your assigned patients.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error('getAppointmentDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointment details.',
    });
  }
};

/**
 * Get Today's Appointments with aggregated dashboard metrics
 * GET /api/appointments/today
 */
export const getTodayAppointments = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const isDoctor = req.user?.role === 'Doctor';

  try {
    // 1. Fetch appointments scheduled for today
    let appointmentsQuery = `
      SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.appointment_type, a.status, a.notes,
             p.name as patient_name, p.patient_code, d.name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users d ON p.assigned_doctor_id = d.id
      WHERE a.appointment_date = CURRENT_DATE AND a.is_deleted = FALSE
    `;

    const queryParams: any[] = [];

    if (isDoctor) {
      appointmentsQuery += ` AND p.assigned_doctor_id = $1`;
      queryParams.push(userId);
    }

    appointmentsQuery += ` ORDER BY a.appointment_time ASC`;

    const appointmentsRes = await query(appointmentsQuery, queryParams);
    const appointments = appointmentsRes.rows;

    // 2. Fetch/calculate widget stats for today
    let statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Checked In' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as upcoming
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date = CURRENT_DATE AND a.is_deleted = FALSE
    `;

    const statsParams: any[] = [];
    if (isDoctor) {
      statsQuery += ` AND p.assigned_doctor_id = $1`;
      statsParams.push(userId);
    }

    const statsRes = await query(statsQuery, statsParams);
    const statsRow = statsRes.rows[0] || { total: 0, checked_in: 0, completed: 0, upcoming: 0 };

    return res.status(200).json({
      success: true,
      appointments,
      stats: {
        totalToday: parseInt(statsRow.total || 0),
        checkedIn: parseInt(statsRow.checked_in || 0),
        completed: parseInt(statsRow.completed || 0),
        upcoming: parseInt(statsRow.upcoming || 0),
      },
    });
  } catch (error) {
    console.error('getTodayAppointments error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve today's appointments and metrics.",
    });
  }
};

/**
 * Search/List all appointments with filters
 * GET /api/appointments
 */
export const searchAppointments = async (req: AuthenticatedRequest, res: Response) => {
  const { date, status, patientId, search } = req.query;
  const userId = req.user?.userId;
  const isDoctor = req.user?.role === 'Doctor';

  try {
    let sql = `
      SELECT DISTINCT a.id, a.patient_id, a.appointment_date, a.appointment_time, a.appointment_type, a.status, a.notes,
             p.name as patient_name, p.patient_code, d.name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users d ON p.assigned_doctor_id = d.id
      LEFT JOIN patient_contacts pc ON p.id = pc.patient_id
      WHERE a.is_deleted = FALSE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Doctor role row limit filter
    if (isDoctor) {
      sql += ` AND p.assigned_doctor_id = $${paramIndex++}`;
      params.push(userId);
    }

    // Filter by specific date
    if (date) {
      sql += ` AND a.appointment_date = $${paramIndex++}`;
      params.push(date);
    }

    // Filter by status
    if (status) {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    // Filter by patient ID
    if (patientId) {
      sql += ` AND a.patient_id = $${paramIndex++}`;
      params.push(patientId);
    }

    // Search keywords (Name, Code, CNIC, Phone)
    if (search) {
      const searchPattern = `%${search}%`;
      sql += ` AND (
        p.name ILIKE $${paramIndex} OR 
        p.patient_code ILIKE $${paramIndex} OR 
        p.cnic ILIKE $${paramIndex} OR 
        pc.contact_number ILIKE $${paramIndex}
      )`;
      params.push(searchPattern);
      paramIndex++;
    }

    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time ASC`;

    const searchRes = await query(sql, params);

    return res.status(200).json({
      success: true,
      appointments: searchRes.rows,
    });
  } catch (error) {
    console.error('searchAppointments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search appointments.',
    });
  }
};

/**
 * Update only the appointment status
 * PATCH /api/appointments/:id/status
 */
export const updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required.',
    });
  }

  const validStatuses = ['Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid appointment status.',
    });
  }

  try {
    const checkRes = await query(
      'SELECT id FROM appointments WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    await query(
      'UPDATE appointments SET status = $1 WHERE id = $2 AND is_deleted = FALSE',
      [status, id]
    );

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
    });
  } catch (error) {
    console.error('updateAppointmentStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment status.',
    });
  }
};

/**
 * Cancel an appointment (Status to Cancelled)
 * PATCH /api/appointments/:id/cancel
 */
export const cancelAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const checkRes = await query(
      'SELECT id FROM appointments WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.',
      });
    }

    await query(
      "UPDATE appointments SET status = 'Cancelled' WHERE id = $1 AND is_deleted = FALSE",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully.',
    });
  } catch (error) {
    console.error('cancelAppointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment.',
    });
  }
};

/**
 * Soft delete an appointment
 * DELETE /api/appointments/:id
 */
export const deleteAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const checkRes = await query(
      'SELECT id FROM appointments WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );

    if ((checkRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment record not found.',
      });
    }

    await query(
      'UPDATE appointments SET is_deleted = TRUE WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully.',
    });
  } catch (error) {
    console.error('deleteAppointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete appointment record.',
    });
  }
};
