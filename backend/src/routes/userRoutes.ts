import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, getRoles, getActiveDoctors, updateSelfProfile } from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticateToken);

// Accessible by any logged-in staff member to populate assignments dropdowns
router.get('/doctors', getActiveDoctors);

// Accessible by any logged-in staff member to update their own profile details (rate-limited: max 5 requests per minute)
router.put('/profile', rateLimiter(5, 60000), updateSelfProfile);

router.post('/', requireRole(['Admin', 'Receptionist']), createUser);

router.use(requireRole(['Admin']));

router.get('/roles', getRoles);
router.get('/', getUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
