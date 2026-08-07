import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditAction } from '../utils/audit';

/**
 * Helper to build date range clauses
 */
const getDateRangeClause = (
  column: string,
  startDate?: string,
  endDate?: string,
  paramIndexStart: number = 1
): { clause: string; params: any[] } => {
  const params: any[] = [];
  let clause = '';
  let index = paramIndexStart;

  if (startDate) {
    clause += ` AND ${column} >= $${index}`;
    params.push(new Date(startDate));
    index++;
  }
  if (endDate) {
    // Set end date to end of the day (23:59:59.999) to include all records of that day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    clause += ` AND ${column} <= $${index}`;
    params.push(end);
    index++;
  }

  return { clause, params };
};

/**
 * Helper to build Date-only (DATE type) range clauses without timestamps
 */
const getDateOnlyRangeClause = (
  column: string,
  startDate?: string,
  endDate?: string,
  paramIndexStart: number = 1
): { clause: string; params: any[] } => {
  const params: any[] = [];
  let clause = '';
  let index = paramIndexStart;

  if (startDate) {
    clause += ` AND ${column} >= $${index}`;
    params.push(startDate);
    index++;
  }
  if (endDate) {
    clause += ` AND ${column} <= $${index}`;
    params.push(endDate);
    index++;
  }

  return { clause, params };
};

/**
 * 1. Daily Patients Report
 * GET /api/reports/daily-patients
 */
export const getDailyPatientsReport = async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, patientId } = req.query as {
    startDate?: string;
    endDate?: string;
    patientId?: string;
  };

  try {
    let sql = `
      SELECT DATE(v.visit_date) AS date, 
             COUNT(DISTINCT v.patient_id) AS patient_count, 
             COUNT(*) AS visit_count
      FROM visits v
      WHERE v.is_deleted = FALSE
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply date range filters
    const dateRange = getDateRangeClause('v.visit_date', startDate, endDate, paramIndex);
    sql += dateRange.clause;
    params.push(...dateRange.params);
    paramIndex += dateRange.params.length;

    // Apply Patient ID filter
    if (patientId) {
      sql += ` AND v.patient_id = $${paramIndex}`;
      params.push(patientId);
      paramIndex++;
    }

    sql += `
      GROUP BY DATE(v.visit_date)
      ORDER BY DATE(v.visit_date) DESC
    `;

    const reportRes = await query(sql, params);

    return res.status(200).json({
      success: true,
      report: reportRes.rows,
    });
  } catch (error) {
    console.error('getDailyPatientsReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Daily Patients Report.',
    });
  }
};

/**
 * 2. Revenue Report (Admin only)
 * GET /api/reports/revenue
 */
export const getRevenueReport = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only system Administrators can access financial reports.',
    });
  }

  const { startDate, endDate, status, patientId, aggregation = 'daily' } = req.query as {
    startDate?: string;
    endDate?: string;
    status?: string; // payment_status: 'Unpaid' | 'Partially Paid' | 'Paid'
    patientId?: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
  };

  try {
    // 1. Calculate Summary Metrics (Total Billed, Total Paid, Outstanding)
    let summarySql = `
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_billed,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(remaining_amount), 0) AS total_outstanding
      FROM bills
      WHERE is_deleted = FALSE
    `;
    const summaryParams: any[] = [];
    let summaryIndex = 1;

    const summaryDateRange = getDateRangeClause('created_at', startDate, endDate, summaryIndex);
    summarySql += summaryDateRange.clause;
    summaryParams.push(...summaryDateRange.params);
    summaryIndex += summaryDateRange.params.length;

    if (status) {
      summarySql += ` AND payment_status = $${summaryIndex}`;
      summaryParams.push(status);
      summaryIndex++;
    }
    if (patientId) {
      summarySql += ` AND patient_id = $${summaryIndex}`;
      summaryParams.push(patientId);
      summaryIndex++;
    }

    const summaryRes = await query(summarySql, summaryParams);
    const summary = summaryRes.rows[0];

    // 2. Fetch Aggregated Breakdown
    let aggField = `DATE(created_at)`;
    if (aggregation === 'weekly') {
      aggField = `DATE_TRUNC('week', created_at)::date`;
    } else if (aggregation === 'monthly') {
      aggField = `DATE_TRUNC('month', created_at)::date`;
    }

    let breakdownSql = `
      SELECT 
        ${aggField} AS period,
        COALESCE(SUM(total_amount), 0) AS total_billed,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(remaining_amount), 0) AS total_outstanding,
        COUNT(*) AS invoice_count
      FROM bills
      WHERE is_deleted = FALSE
    `;
    const breakdownParams: any[] = [];
    let breakdownIndex = 1;

    const breakdownDateRange = getDateRangeClause('created_at', startDate, endDate, breakdownIndex);
    breakdownSql += breakdownDateRange.clause;
    breakdownParams.push(...breakdownDateRange.params);
    breakdownIndex += breakdownDateRange.params.length;

    if (status) {
      breakdownSql += ` AND payment_status = $${breakdownIndex}`;
      breakdownParams.push(status);
      breakdownIndex++;
    }
    if (patientId) {
      breakdownSql += ` AND patient_id = $${breakdownIndex}`;
      breakdownParams.push(patientId);
      breakdownIndex++;
    }

    breakdownSql += `
      GROUP BY ${aggField}
      ORDER BY period DESC
    `;

    const breakdownRes = await query(breakdownSql, breakdownParams);

    return res.status(200).json({
      success: true,
      summary,
      report: breakdownRes.rows,
    });
  } catch (error) {
    console.error('getRevenueReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Revenue Report.',
    });
  }
};

/**
 * 3. Appointment Report
 * GET /api/reports/appointments
 */
export const getAppointmentReport = async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, status, patientId } = req.query as {
    startDate?: string;
    endDate?: string;
    status?: string;
    patientId?: string;
  };

  try {
    // 1. Aggregate status distribution counts
    let statsSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'Checked In' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'No Show' THEN 1 END) as no_show
      FROM appointments a
      WHERE a.is_deleted = FALSE
    `;
    const statsParams: any[] = [];
    let statsIndex = 1;

    const statsDateRange = getDateOnlyRangeClause('a.appointment_date', startDate, endDate, statsIndex);
    statsSql += statsDateRange.clause;
    statsParams.push(...statsDateRange.params);
    statsIndex += statsDateRange.params.length;

    if (status) {
      statsSql += ` AND a.status = $${statsIndex}`;
      statsParams.push(status);
      statsIndex++;
    }
    if (patientId) {
      statsSql += ` AND a.patient_id = $${statsIndex}`;
      statsParams.push(patientId);
      statsIndex++;
    }

    const statsRes = await query(statsSql, statsParams);
    const summary = statsRes.rows[0];

    // 2. Fetch detailed list
    let listSql = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.appointment_type, a.status, a.notes,
             p.name AS patient_name, p.patient_code, p.id AS patient_id
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.is_deleted = FALSE
    `;
    const listParams: any[] = [];
    let listIndex = 1;

    const listDateRange = getDateOnlyRangeClause('a.appointment_date', startDate, endDate, listIndex);
    listSql += listDateRange.clause;
    listParams.push(...listDateRange.params);
    listIndex += listDateRange.params.length;

    if (status) {
      listSql += ` AND a.status = $${listIndex}`;
      listParams.push(status);
      listIndex++;
    }
    if (patientId) {
      listSql += ` AND a.patient_id = $${listIndex}`;
      listParams.push(patientId);
      listIndex++;
    }

    listSql += `
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `;

    const listRes = await query(listSql, listParams);

    return res.status(200).json({
      success: true,
      summary,
      report: listRes.rows,
    });
  } catch (error) {
    console.error('getAppointmentReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Appointment Report.',
    });
  }
};

/**
 * 4. Patient Report
 * GET /api/reports/patients
 */
export const getPatientReport = async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate, patientId } = req.query as {
    startDate?: string;
    endDate?: string;
    patientId?: string;
  };

  try {
    const params: any[] = [];
    let index = 1;

    // 1. Total Registered Patients overall (up to end date if filter provided)
    let totalSql = `SELECT COUNT(*) AS count FROM patients WHERE 1=1`;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      totalSql += ` AND created_at <= $1`;
      params.push(end);
      index++;
    }
    const totalRes = await query(totalSql, params.slice(0, index - 1));
    const totalRegistered = parseInt(totalRes.rows[0]?.count || '0');

    // Reset params for range calculations
    const rangeParams: any[] = [];
    let rangeIndex = 1;

    // 2. New Patients count (created in range)
    let newSql = `SELECT COUNT(*) AS count FROM patients WHERE 1=1`;
    const newDateRange = getDateRangeClause('created_at', startDate, endDate, rangeIndex);
    newSql += newDateRange.clause;
    rangeParams.push(...newDateRange.params);
    rangeIndex += newDateRange.params.length;

    if (patientId) {
      newSql += ` AND id = $${rangeIndex}`;
      rangeParams.push(patientId);
      rangeIndex++;
    }

    const newRes = await query(newSql, rangeParams);
    const newPatients = parseInt(newRes.rows[0]?.count || '0');

    // 3. Returning Patients count (visited in range but registered before)
    // If no startDate is provided, returning is 0 because there's no pre-period threshold.
    let returningPatients = 0;
    if (startDate) {
      let returningSql = `
        SELECT COUNT(DISTINCT v.patient_id) AS count
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        WHERE v.is_deleted = FALSE 
          AND p.created_at < $1
      `;
      const retParams: any[] = [new Date(startDate)];
      let retIndex = 2;

      // Ensure visit date is inside range
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        returningSql += ` AND v.visit_date >= $1 AND v.visit_date <= $2`;
        retParams.push(end);
        retIndex++;
      } else {
        returningSql += ` AND v.visit_date >= $1`;
      }

      if (patientId) {
        returningSql += ` AND v.patient_id = $${retIndex}`;
        retParams.push(patientId);
        retIndex++;
      }

      const retRes = await query(returningSql, retParams);
      returningPatients = parseInt(retRes.rows[0]?.count || '0');
    }

    // 4. Detail list of patients registered in range
    let listSql = `
      SELECT p.id, p.name AS patient_name, p.patient_code, p.created_at, p.gender, p.age,
             d.name AS assigned_doctor_name
      FROM patients p
      JOIN users d ON p.assigned_doctor_id = d.id
      WHERE 1=1
    `;
    const listParams: any[] = [];
    let listIndex = 1;

    const listDateRange = getDateRangeClause('p.created_at', startDate, endDate, listIndex);
    listSql += listDateRange.clause;
    listParams.push(...listDateRange.params);
    listIndex += listDateRange.params.length;

    if (patientId) {
      listSql += ` AND p.id = $${listIndex}`;
      listParams.push(patientId);
      listIndex++;
    }

    listSql += ` ORDER BY p.created_at DESC`;

    const listRes = await query(listSql, listParams);

    return res.status(200).json({
      success: true,
      summary: {
        totalRegistered,
        newPatients,
        returningPatients,
      },
      report: listRes.rows,
    });
  } catch (error) {
    console.error('getPatientReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate Patient Report.',
    });
  }
};

/**
 * 5. Export Reports to CSV
 * GET /api/reports/export
 */
export const exportReport = async (req: AuthenticatedRequest, res: Response) => {
  const { reportName, startDate, endDate, status, patientId, aggregation = 'daily' } = req.query as {
    reportName: 'daily-patients' | 'revenue' | 'appointments' | 'patients';
    startDate?: string;
    endDate?: string;
    status?: string;
    patientId?: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
  };

  if (!reportName) {
    return res.status(400).json({
      success: false,
      message: 'Report name is required for export.',
    });
  }

  // Security: Restrict non-admins from exporting revenue data
  if (reportName === 'revenue' && req.user?.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permissions to export financial data.',
    });
  }

  try {
    let csvContent = '';
    let fileName = `report_${reportName}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportName === 'daily-patients') {
      let sql = `
        SELECT DATE(v.visit_date) AS date, 
               COUNT(DISTINCT v.patient_id) AS patient_count, 
               COUNT(*) AS visit_count
        FROM visits v
        WHERE v.is_deleted = FALSE
      `;
      const params: any[] = [];
      let paramIndex = 1;
      const dateRange = getDateRangeClause('v.visit_date', startDate, endDate, paramIndex);
      sql += dateRange.clause;
      params.push(...dateRange.params);
      paramIndex += dateRange.params.length;

      if (patientId) {
        sql += ` AND v.patient_id = $${paramIndex}`;
        params.push(patientId);
        paramIndex++;
      }

      sql += ` GROUP BY DATE(v.visit_date) ORDER BY DATE(v.visit_date) DESC`;
      const data = await query(sql, params);

      // Construct CSV
      csvContent += 'Date,Number of Patients,Number of Visits\r\n';
      data.rows.forEach(row => {
        const d = new Date(row.date).toISOString().split('T')[0];
        csvContent += `"${d}",${row.patient_count},${row.visit_count}\r\n`;
      });

    } else if (reportName === 'revenue') {
      let aggField = `DATE(created_at)`;
      if (aggregation === 'weekly') {
        aggField = `DATE_TRUNC('week', created_at)::date`;
      } else if (aggregation === 'monthly') {
        aggField = `DATE_TRUNC('month', created_at)::date`;
      }

      let breakdownSql = `
        SELECT 
          ${aggField} AS period,
          COALESCE(SUM(total_amount), 0) AS total_billed,
          COALESCE(SUM(amount_paid), 0) AS total_paid,
          COALESCE(SUM(remaining_amount), 0) AS total_outstanding,
          COUNT(*) AS invoice_count
        FROM bills
        WHERE is_deleted = FALSE
      `;
      const breakdownParams: any[] = [];
      let breakdownIndex = 1;
      const breakdownDateRange = getDateRangeClause('created_at', startDate, endDate, breakdownIndex);
      breakdownSql += breakdownDateRange.clause;
      breakdownParams.push(...breakdownDateRange.params);
      breakdownIndex += breakdownDateRange.params.length;

      if (status) {
        breakdownSql += ` AND payment_status = $${breakdownIndex}`;
        breakdownParams.push(status);
        breakdownIndex++;
      }
      if (patientId) {
        breakdownSql += ` AND patient_id = $${breakdownIndex}`;
        breakdownParams.push(patientId);
        breakdownIndex++;
      }

      breakdownSql += ` GROUP BY ${aggField} ORDER BY period DESC`;
      const data = await query(breakdownSql, breakdownParams);

      csvContent += 'Period/Date,Total Billed,Amount Paid,Outstanding Amount,Invoice Count\r\n';
      data.rows.forEach(row => {
        const p = new Date(row.period).toISOString().split('T')[0];
        csvContent += `"${p}",${row.total_billed},${row.total_paid},${row.total_outstanding},${row.invoice_count}\r\n`;
      });

    } else if (reportName === 'appointments') {
      let listSql = `
        SELECT a.appointment_date, a.appointment_time, a.appointment_type, a.status, a.notes,
               p.name AS patient_name, p.patient_code
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.is_deleted = FALSE
      `;
      const listParams: any[] = [];
      let listIndex = 1;
      const listDateRange = getDateOnlyRangeClause('a.appointment_date', startDate, endDate, listIndex);
      listSql += listDateRange.clause;
      listParams.push(...listDateRange.params);
      listIndex += listDateRange.params.length;

      if (status) {
        listSql += ` AND a.status = $${listIndex}`;
        listParams.push(status);
        listIndex++;
      }
      if (patientId) {
        listSql += ` AND a.patient_id = $${listIndex}`;
        listParams.push(patientId);
        listIndex++;
      }

      listSql += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC`;
      const data = await query(listSql, listParams);

      csvContent += 'Date,Time,Patient Name,Patient Code,Appointment Type,Status,Notes\r\n';
      data.rows.forEach(row => {
        const d = new Date(row.appointment_date).toISOString().split('T')[0];
        csvContent += `"${d}","${row.appointment_time}","${row.patient_name.replace(/"/g, '""')}","${row.patient_code}","${row.appointment_type}","${row.status}","${(row.notes || '').replace(/"/g, '""')}"\r\n`;
      });

    } else if (reportName === 'patients') {
      let listSql = `
        SELECT p.name AS patient_name, p.patient_code, p.created_at, p.gender, p.age,
               d.name AS assigned_doctor_name
        FROM patients p
        JOIN users d ON p.assigned_doctor_id = d.id
        WHERE 1=1
      `;
      const listParams: any[] = [];
      let listIndex = 1;
      const listDateRange = getDateRangeClause('p.created_at', startDate, endDate, listIndex);
      listSql += listDateRange.clause;
      listParams.push(...listDateRange.params);
      listIndex += listDateRange.params.length;

      if (patientId) {
        listSql += ` AND p.id = $${listIndex}`;
        listParams.push(patientId);
        listIndex++;
      }

      listSql += ` ORDER BY p.created_at DESC`;
      const data = await query(listSql, listParams);

      csvContent += 'Registration Date,Patient Name,Patient Code,Gender,Age,Assigned Doctor\r\n';
      data.rows.forEach(row => {
        const d = new Date(row.created_at).toISOString().split('T')[0];
        csvContent += `"${d}","${row.patient_name.replace(/"/g, '""')}","${row.patient_code}","${row.gender}",${row.age},"${row.assigned_doctor_name.replace(/"/g, '""')}"\r\n`;
      });
    }

    if (req.user) {
      await logAuditAction(
        req.user.userId,
        req.user.name,
        'Report Data Exported',
        null,
        { report_name: reportName, start_date: startDate, end_date: endDate }
      );
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('exportReport error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export report data.',
    });
  }
};
