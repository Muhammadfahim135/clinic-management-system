import { Router } from 'express';
import {
  getDailyPatientsReport,
  getRevenueReport,
  getAppointmentReport,
  getPatientReport,
  exportReport
} from '../controllers/reportController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Require authentication for all reports
router.use(authenticateToken);

// Operational reports (Daily patients, appointments, patients) are accessible by all roles
router.get('/daily-patients', requireRole(['Admin', 'Doctor', 'Receptionist']), getDailyPatientsReport);
router.get('/appointments', requireRole(['Admin', 'Doctor', 'Receptionist']), getAppointmentReport);
router.get('/patients', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientReport);

// Financial/Revenue reports are strictly limited to Admin
router.get('/revenue', requireRole(['Admin']), getRevenueReport);

// Export to CSV route (inner-controller authorization checks will enforce security for financial reports)
router.get('/export', requireRole(['Admin', 'Doctor', 'Receptionist']), exportReport);

export default router;
