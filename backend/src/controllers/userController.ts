import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get all users.
 * GET /api/users
 */
export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usersRes = await query(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at, r.name as role, r.id as role_id,
              u.department_id, d.name as department_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      users: usersRes.rows,
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

/**
 * Create a new user.
 * POST /api/users
 */
export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  let { name, email, password, roleId, departmentId, roleName } = req.body;

  if (!roleId && roleName) {
    const roleDbRes = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
    if (roleDbRes.rowCount) {
      roleId = roleDbRes.rows[0].id;
    }
  }

  if (!name || !email || !password || !roleId) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, password, and role selection are required.',
    });
  }

  try {
    // 1. Check if email already exists
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // 2. Validate roleId exists and get role name
    const roleCheck = await query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if ((roleCheck.rowCount ?? 0) === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selection.',
      });
    }

    const selectedRoleName = roleCheck.rows[0].name;

    // Enforce role-based boundaries: Receptionists can ONLY create Doctors
    if (req.user?.role === 'Receptionist' && selectedRoleName !== 'Doctor') {
      return res.status(403).json({
        success: false,
        message: 'Receptionists are only authorized to register Doctor accounts.',
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Insert user
    const newUserRes = await query(
      `INSERT INTO users (name, email, password_hash, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, is_active, department_id, created_at`,
      [name.trim(), email.toLowerCase().trim(), hashedPassword, roleId, departmentId || null]
    );

    const newUser = newUserRes.rows[0];

    // Fetch role name for response
    const roleNameRes = await query('SELECT name FROM roles WHERE id = $1', [roleId]);
    const roleName = roleNameRes.rows[0].name;

    // Fetch department name if set
    let deptName = null;
    if (departmentId) {
      const deptNameRes = await query('SELECT name FROM departments WHERE id = $1', [departmentId]);
      if (deptNameRes.rowCount) deptName = deptNameRes.rows[0].name;
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: {
        ...newUser,
        role: roleName,
        role_id: roleId,
        department_name: deptName,
      },
    });
  } catch (error) {
    console.error('createUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user.',
    });
  }
};

/**
 * Update a user.
 * PUT /api/users/:id
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, roleId, isActive, departmentId } = req.body;

  if (!name || !email || !roleId) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and roleId are required.',
    });
  }

  try {
    // 1. Validate user exists
    const userCheck = await query('SELECT id, password_hash FROM users WHERE id = $1', [id]);
    if ((userCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // 2. Validate roleId
    const roleCheck = await query('SELECT id FROM roles WHERE id = $1', [roleId]);
    if ((roleCheck.rowCount ?? 0) === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role selection.',
      });
    }

    // 3. Check if email is taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id <> $2',
      [email.toLowerCase().trim(), id]
    );
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    // 4. Update fields
    let queryText = '';
    let params = [];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      queryText = `
        UPDATE users 
        SET name = $1, email = $2, password_hash = $3, role_id = $4, is_active = $5, department_id = $6
        WHERE id = $7
        RETURNING id, name, email, is_active, department_id, created_at
      `;
      params = [name.trim(), email.toLowerCase().trim(), hashedPassword, roleId, isActive !== false, departmentId || null, id];
    } else {
      queryText = `
        UPDATE users 
        SET name = $1, email = $2, role_id = $3, is_active = $4, department_id = $5
        WHERE id = $6
        RETURNING id, name, email, is_active, department_id, created_at
      `;
      params = [name.trim(), email.toLowerCase().trim(), roleId, isActive !== false, departmentId || null, id];
    }

    const updatedUserRes = await query(queryText, params);
    const updatedUser = updatedUserRes.rows[0];

    const roleNameRes = await query('SELECT name FROM roles WHERE id = $1', [roleId]);
    const roleName = roleNameRes.rows[0].name;

    let deptName = null;
    if (updatedUser.department_id) {
      const deptNameRes = await query('SELECT name FROM departments WHERE id = $1', [updatedUser.department_id]);
      if (deptNameRes.rowCount) deptName = deptNameRes.rows[0].name;
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        ...updatedUser,
        role: roleName,
        role_id: roleId,
        department_name: deptName,
      },
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user.',
    });
  }
};

/**
 * Delete a user.
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user?.userId === id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account.',
    });
  }

  try {
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
    if ((userCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Perform deletion
    await query('DELETE FROM users WHERE id = $1', [id]);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    // Role FK constraint check (restricted deletion)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user. The user might have linked system records.',
    });
  }
};

/**
 * Get all roles.
 * GET /api/users/roles
 */
export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rolesRes = await query('SELECT id, name, description FROM roles ORDER BY name');
    return res.status(200).json({
      success: true,
      roles: rolesRes.rows,
    });
  } catch (error) {
    console.error('getRoles error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch roles.',
    });
  }
};

/**
 * Get active doctors list (accessible to all authenticated staff for assignments).
 * GET /api/users/doctors
 */
export const getActiveDoctors = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let doctorsRes;
    try {
      doctorsRes = await query(
        `SELECT u.id, u.name, u.email, u.department_id, d.name as department_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE r.name = 'Doctor' AND u.is_active = TRUE
         ORDER BY u.name`
      );
    } catch (dbErr) {
      // Fallback query if departments table or department_id column is not yet migrated
      console.warn('getActiveDoctors fallback query used (departments missing):', (dbErr as any)?.message);
      doctorsRes = await query(
        `SELECT u.id, u.name, u.email, NULL as department_id, NULL as department_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE r.name = 'Doctor' AND u.is_active = TRUE
         ORDER BY u.name`
      );
    }

    return res.status(200).json({
      success: true,
      doctors: doctorsRes.rows,
    });
  } catch (error) {
    console.error('getActiveDoctors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctors.',
    });
  }
};

/**
 * Update personal profile settings or change password
 * PUT /api/users/profile
 */
export const updateSelfProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { name, email, oldPassword, newPassword } = req.body;

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  try {
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const currentUser = userRes.rows[0];

    const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email.toLowerCase().trim(), userId]);
    if ((emailCheck.rowCount ?? 0) > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    let queryText = '';
    let params = [];

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to change password.' });
      }

      const isMatch = await bcrypt.compare(oldPassword, currentUser.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      const newHashed = await bcrypt.hash(newPassword, 10);
      queryText = `UPDATE users SET name = $1, email = $2, password_hash = $3 WHERE id = $4 RETURNING id, name, email`;
      params = [name.trim(), email.toLowerCase().trim(), newHashed, userId];
    } else {
      queryText = `UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email`;
      params = [name.trim(), email.toLowerCase().trim(), userId];
    }

    const updatedRes = await query(queryText, params);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedRes.rows[0]
    });
  } catch (error) {
    console.error('updateSelfProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

