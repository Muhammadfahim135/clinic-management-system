import { Response } from 'express';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditAction } from '../utils/audit';

/**
 * Get all departments
 * GET /api/departments
 */
export const getDepartments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let deptsRes;
    try {
      deptsRes = await query(
        `SELECT d.*, 
                (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = TRUE) AS doctor_count
         FROM departments d
         ORDER BY d.name ASC`
      );
    } catch (dbErr) {
      console.warn('getDepartments fallback used (departments table missing):', (dbErr as any)?.message);
      return res.status(200).json({
        success: true,
        departments: []
      });
    }

    return res.status(200).json({
      success: true,
      departments: deptsRes.rows
    });
  } catch (error) {
    console.error('getDepartments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve specialty departments.'
    });
  }
};

/**
 * Create a new department (restricted to Admin)
 * POST /api/departments
 */
export const createDepartment = async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Department name is required.' 
    });
  }

  try {
    const checkRes = await query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    if ((checkRes.rowCount ?? 0) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Department name already exists.' 
      });
    }

    const insertRes = await query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name.trim(), description ? description.trim() : null]
    );

    if (req.user) {
      await logAuditAction(
        req.user.userId,
        req.user.name,
        'Department Created',
        null,
        { department: name.trim() }
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Specialty department created successfully.',
      department: insertRes.rows[0]
    });
  } catch (error) {
    console.error('createDepartment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create department.'
    });
  }
};
