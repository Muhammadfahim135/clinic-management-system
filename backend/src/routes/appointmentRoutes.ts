import { Router } from 'express';
import {
  createAppointment,
  updateAppointment,
  getAppointmentDetails,
  getTodayAppointments,
  searchAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  deleteAppointment,
} from '../controllers/appointmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all appointment routes require authentication
router.use(authenticateToken);

// Read-only endpoints (Accessible by Admin, Receptionist, and Doctor)
router.get('/', requireRole(['Admin', 'Doctor', 'Receptionist']), searchAppointments);
router.get('/today', requireRole(['Admin', 'Doctor', 'Receptionist']), getTodayAppointments);
router.get('/:id', requireRole(['Admin', 'Doctor', 'Receptionist']), getAppointmentDetails);

// Write/Mutation endpoints (Restricted to Admin and Receptionist only)
router.post('/', requireRole(['Admin', 'Receptionist']), createAppointment);
router.put('/:id', requireRole(['Admin', 'Receptionist']), updateAppointment);
router.patch('/:id/status', requireRole(['Admin', 'Receptionist']), updateAppointmentStatus);
router.patch('/:id/cancel', requireRole(['Admin', 'Receptionist']), cancelAppointment);
router.delete('/:id', requireRole(['Admin', 'Receptionist']), deleteAppointment);

export default router;
