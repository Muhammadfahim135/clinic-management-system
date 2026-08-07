import { Router } from 'express';
import {
  createPrescription,
  updatePrescription,
  getPrescriptionDetails,
  getPatientPrescriptions,
  getVisitPrescriptions,
  deletePrescription,
  getAllPrescriptions,
} from '../controllers/prescriptionController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all prescription routes require authentication
router.use(authenticateToken);

// Read-only endpoints (Accessible by Admin, Doctor, and Receptionist)
router.get('/', requireRole(['Admin', 'Doctor', 'Receptionist']), getAllPrescriptions);
router.get('/:id', requireRole(['Admin', 'Doctor', 'Receptionist']), getPrescriptionDetails);
router.get('/patient/:patientId', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientPrescriptions);
router.get('/visit/:visitId', requireRole(['Admin', 'Doctor', 'Receptionist']), getVisitPrescriptions);

// Write/Mutation endpoints (Restricted to Admin and Doctor only)
router.post('/', requireRole(['Admin', 'Doctor']), createPrescription);
router.put('/:id', requireRole(['Admin', 'Doctor']), updatePrescription);
router.delete('/:id', requireRole(['Admin', 'Doctor']), deletePrescription);

export default router;
