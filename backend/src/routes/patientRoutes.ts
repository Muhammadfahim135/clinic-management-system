import { Router } from 'express';
import { 
  registerPatient, 
  updatePatient, 
  searchPatients, 
  getPatientDetails, 
  addPatientContact, 
  updatePatientContact,
  deletePatientContact,
  deletePatient
} from '../controllers/patientController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all patient routes require authentication
router.use(authenticateToken);

// Patient endpoints
router.get('/', requireRole(['Admin', 'Doctor', 'Receptionist']), searchPatients);
router.get('/:id', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientDetails);

router.post('/', requireRole(['Admin', 'Receptionist']), registerPatient);
router.put('/:id', requireRole(['Admin', 'Receptionist']), updatePatient);
router.delete('/:id', requireRole(['Admin']), deletePatient);

// Contact endpoints
router.post('/:id/contacts', requireRole(['Admin', 'Receptionist']), addPatientContact);
router.put('/:id/contacts/:contactId', requireRole(['Admin', 'Receptionist']), updatePatientContact);
router.delete('/:id/contacts/:contactId', requireRole(['Admin', 'Receptionist']), deletePatientContact);

export default router;
