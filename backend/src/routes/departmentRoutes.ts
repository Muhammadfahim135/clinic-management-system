import { Router } from 'express';
import { getDepartments, createDepartment } from '../controllers/departmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// All staff can list/view departments
router.get('/', getDepartments);

// Only Admin can create a specialty department
router.post('/', requireRole(['Admin']), createDepartment);

export default router;
