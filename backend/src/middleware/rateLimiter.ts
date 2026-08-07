import { Request, Response, NextFunction } from 'express';

interface RateLimitData {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitData>();

/**
 * Custom memory-based rate limiter middleware.
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP address
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const clientData = rateLimitMap.get(key);

    if (!clientData || now > clientData.resetTime) {
      // Initialize or reset window
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    clientData.count++;
    
    if (clientData.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
      });
    }

    next();
  };
};
