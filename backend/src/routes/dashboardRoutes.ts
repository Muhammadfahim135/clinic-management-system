import { Router } from 'express';
import {
  getDashboardSummary,
  getTodayAppointmentsWidget,
  getRecentPatientsWidget,
  getRecentPaymentsWidget
} from '../controllers/dashboardController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Require authentication for all dashboard routes
router.use(authenticateToken);

// Summary & Lists accessible by relevant roles (Doctors restricted inside controllers/routes where applicable)
router.get('/summary', requireRole(['Admin', 'Doctor', 'Receptionist']), getDashboardSummary);
router.get('/appointments', requireRole(['Admin', 'Doctor', 'Receptionist']), getTodayAppointmentsWidget);
router.get('/patients', requireRole(['Admin', 'Doctor', 'Receptionist']), getRecentPatientsWidget);

// Recent payments lists are hidden/restricted from Doctor role (Admin/Receptionist only)
router.get('/payments', requireRole(['Admin', 'Receptionist']), getRecentPaymentsWidget);

export default router;
