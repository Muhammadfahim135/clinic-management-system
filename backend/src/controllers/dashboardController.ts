import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get dashboard summary cards
 * GET /api/dashboard/summary
 */
export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response) => {
  const isDoctor = req.user?.role === 'Doctor';
  const userId = req.user?.userId;

  try {
    // 1. Today's Total Patients (who had visits logged today)
    let todayPatientsQuery = `
      SELECT COUNT(DISTINCT patient_id) AS count 
      FROM visits 
      WHERE DATE(visit_date) = CURRENT_DATE AND is_deleted = FALSE
    `;
    const todayPatientsParams: any[] = [];
    if (isDoctor) {
      todayPatientsQuery += ` AND doctor_id = $1`;
      todayPatientsParams.push(userId);
    }
    const todayPatientsRes = await query(todayPatientsQuery, todayPatientsParams);
    const todayTotalPatients = parseInt(todayPatientsRes.rows[0]?.count || '0');

    // 2. Today's Appointments
    let todayApptQuery = `
      SELECT COUNT(*) AS count 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date = CURRENT_DATE AND a.is_deleted = FALSE
    `;
    const todayApptParams: any[] = [];
    if (isDoctor) {
      todayApptQuery += ` AND p.assigned_doctor_id = $1`;
      todayApptParams.push(userId);
    }
    const todayApptRes = await query(todayApptQuery, todayApptParams);
    const todayAppointments = parseInt(todayApptRes.rows[0]?.count || '0');

    // 3. Today's Revenue (Admin/Receptionist only)
    let todayRevenue: number | null = null;
    if (!isDoctor) {
      const todayRevRes = await query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS sum 
         FROM payments 
         WHERE DATE(payment_date) = CURRENT_DATE`
      );
      todayRevenue = parseFloat(todayRevRes.rows[0]?.sum || '0');
    }

    // 4. Total Registered Patients
    let totalPatientsQuery = `SELECT COUNT(*) AS count FROM patients`;
    const totalPatientsParams: any[] = [];
    if (isDoctor) {
      totalPatientsQuery += ` WHERE assigned_doctor_id = $1`;
      totalPatientsParams.push(userId);
    }
    const totalPatientsRes = await query(totalPatientsQuery, totalPatientsParams);
    const totalRegisteredPatients = parseInt(totalPatientsRes.rows[0]?.count || '0');

    // 5. Pending Payments (Admin/Receptionist only)
    let pendingPayments: number | null = null;
    if (!isDoctor) {
      const pendingRes = await query(
        `SELECT COALESCE(SUM(remaining_amount), 0) AS sum 
         FROM bills 
         WHERE is_deleted = FALSE`
      );
      pendingPayments = parseFloat(pendingRes.rows[0]?.sum || '0');
    }

    // 6. Completed Appointments (today's completed appointments)
    let completedApptQuery = `
      SELECT COUNT(*) AS count 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date = CURRENT_DATE AND a.status = 'Completed' AND a.is_deleted = FALSE
    `;
    const completedApptParams: any[] = [];
    if (isDoctor) {
      completedApptQuery += ` AND p.assigned_doctor_id = $1`;
      completedApptParams.push(userId);
    }
    const completedApptRes = await query(completedApptQuery, completedApptParams);
    const completedAppointments = parseInt(completedApptRes.rows[0]?.count || '0');

    return res.status(200).json({
      success: true,
      summary: {
        todayTotalPatients,
        todayAppointments,
        todayRevenue,
        totalRegisteredPatients,
        pendingPayments,
        completedAppointments,
      },
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary metrics.',
    });
  }
};

/**
 * Get Today's Appointments widget list
 * GET /api/dashboard/appointments
 */
export const getTodayAppointmentsWidget = async (req: AuthenticatedRequest, res: Response) => {
  const isDoctor = req.user?.role === 'Doctor';
  const userId = req.user?.userId;

  try {
    let appointmentsQuery = `
      SELECT a.id, a.patient_id, a.appointment_time, a.status,
             p.name AS patient_name, p.patient_code
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.appointment_date = CURRENT_DATE AND a.is_deleted = FALSE
    `;
    const queryParams: any[] = [];
    if (isDoctor) {
      appointmentsQuery += ` AND p.assigned_doctor_id = $1`;
      queryParams.push(userId);
    }
    appointmentsQuery += ` ORDER BY a.appointment_time ASC`;

    const appointmentsRes = await query(appointmentsQuery, queryParams);

    return res.status(200).json({
      success: true,
      appointments: appointmentsRes.rows,
    });
  } catch (error) {
    console.error('getTodayAppointmentsWidget error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve today\'s appointments widget.',
    });
  }
};

/**
 * Get Recent Patients widget list (5 patients, showing Patient Name, Patient ID, Last Visit Date)
 * GET /api/dashboard/patients
 */
export const getRecentPatientsWidget = async (req: AuthenticatedRequest, res: Response) => {
  const isDoctor = req.user?.role === 'Doctor';
  const userId = req.user?.userId;

  try {
    // Select recent patients, optionally filtering by assigned doctor
    let recentQuery = `
      SELECT p.id, p.name AS patient_name, p.patient_code, MAX(v.visit_date) AS last_visit_date
      FROM patients p
      LEFT JOIN visits v ON p.id = v.patient_id AND v.is_deleted = FALSE
    `;
    const queryParams: any[] = [];
    if (isDoctor) {
      recentQuery += ` WHERE p.assigned_doctor_id = $1`;
      queryParams.push(userId);
    }
    recentQuery += `
      GROUP BY p.id, p.name, p.patient_code, p.created_at
      ORDER BY COALESCE(MAX(v.visit_date), p.created_at) DESC
      LIMIT 5
    `;

    const recentRes = await query(recentQuery, queryParams);

    return res.status(200).json({
      success: true,
      patients: recentRes.rows,
    });
  } catch (error) {
    console.error('getRecentPatientsWidget error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent patients widget.',
    });
  }
};

/**
 * Get Recent Payments widget list (5 payments, showing Bill Number, Patient Name, Payment Method, Amount Received, Payment Date)
 * GET /api/dashboard/payments
 */
export const getRecentPaymentsWidget = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paymentsQuery = `
      SELECT pay.id, pay.amount_paid AS amount_received, pay.payment_method, pay.payment_date, 
             b.bill_number, p.name AS patient_name, p.id AS patient_id
      FROM payments pay
      JOIN bills b ON pay.bill_id = b.id
      JOIN patients p ON b.patient_id = p.id
      WHERE b.is_deleted = FALSE
      ORDER BY pay.payment_date DESC
      LIMIT 5
    `;
    const paymentsRes = await query(paymentsQuery);

    return res.status(200).json({
      success: true,
      payments: paymentsRes.rows,
    });
  } catch (error) {
    console.error('getRecentPaymentsWidget error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent payments widget.',
    });
  }
};
