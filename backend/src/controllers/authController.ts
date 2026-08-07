import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/db';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Handle user login.
 * POST /api/auth/login
 */
export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // 1. Basic validation
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required.' 
    });
  }

  try {
    // 2. Fetch user and their role name
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.is_active, r.name as role 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    const user = userRes.rows[0];

    // 3. Check if user account is active
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is deactivated. Please contact the administrator.' 
      });
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // 5. Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    // 6. Return response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred during login.' 
    });
  }
};

/**
 * Get current authenticated user details.
 * GET /api/auth/me
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized.' 
    });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.name, u.email, u.is_active, r.name as role 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated.' 
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An internal server error occurred fetching user details.' 
    });
  }
};

/**
 * Handle user logout.
 * POST /api/auth/logout
 */
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  // In a stateless JWT auth system, logout is achieved client-side by deleting the token.
  // We can acknowledge the request here.
  return res.status(200).json({
    success: true,
    message: 'Logout successful. Client should discard token.',
  });
};
