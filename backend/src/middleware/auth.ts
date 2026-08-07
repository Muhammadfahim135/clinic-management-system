import { Response, NextFunction } from 'express';
import { Request as ExpressRequest } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

// Define custom Request type extending Express Request to contain user info
export interface AuthenticatedRequest extends ExpressRequest {
  user?: TokenPayload;
}

/**
 * Middleware to authenticate requests via JWT Bearer Token.
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  // Authorization: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No authentication token provided.' 
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired authentication token.' 
    });
  }
};

/**
 * Middleware to enforce role-based access control (RBAC).
 * Expects authenticateToken middleware to have run first.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User authentication required.' 
      });
    }

    const { role } = req.user;

    // Check if the user's role is in the allowed roles list
    // Case-insensitive check for reliability
    const isAuthorized = allowedRoles.some(
      r => r.toLowerCase() === role.toLowerCase()
    );

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden. This resource requires one of the following roles: [${allowedRoles.join(', ')}]` 
      });
    }

    next();
  };
};
