import { Router } from 'express';
import { login, getMe, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public route (rate-limited: max 10 requests per minute)
router.post('/login', rateLimiter(10, 60000), login);

// Protected routes
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

export default router;
