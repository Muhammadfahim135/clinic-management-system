import { query } from '../config/db';

/**
 * Logs a user action to the audit_logs table for security and compliance audits.
 */
export async function logAuditAction(
  userId: string,
  userName: string,
  action: string,
  patientId?: string | null,
  details?: any | null
) {
  try {
    await query(
      `INSERT INTO audit_logs (performed_by, performed_by_name, action, patient_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        userName,
        action,
        patientId || null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
