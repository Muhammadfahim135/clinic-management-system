import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get system-wide audit logs (restricted to Admins)
 * GET /api/audit-logs
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, performedBy, patientId, startDate, endDate } = req.query;
    
    let sql = `
      SELECT al.*, p.name AS patient_name, p.patient_code
      FROM audit_logs al
      LEFT JOIN patients p ON al.patient_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (action) {
      sql += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (performedBy) {
      sql += ` AND al.performed_by = $${paramIndex}`;
      params.push(performedBy);
      paramIndex++;
    }

    if (patientId) {
      sql += ` AND al.patient_id = $${paramIndex}`;
      params.push(patientId);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND al.created_at >= $${paramIndex}`;
      params.push(new Date(startDate as string));
      paramIndex++;
    }

    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      sql += ` AND al.created_at <= $${paramIndex}`;
      params.push(end);
      paramIndex++;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT 300`;

    const logsRes = await query(sql, params);

    return res.status(200).json({
      success: true,
      logs: logsRes.rows
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs.'
    });
  }
};
