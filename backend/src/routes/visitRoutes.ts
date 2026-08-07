import { Router } from 'express';
import { 
  addVisit, 
  updateVisit, 
  getVisitDetails, 
  getPatientVisits, 
  deleteVisit, 
  getPatientTimeline 
} from '../controllers/visitController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all visit routes require authentication
router.use(authenticateToken);

// Patient specific visit endpoints (readable/writable by Admin, Doctor, and Receptionist)
router.post('/patients/:id/visits', requireRole(['Admin', 'Doctor', 'Receptionist']), addVisit);
router.get('/patients/:id/visits', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientVisits);
router.get('/patients/:id/timeline', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientTimeline);

// Direct visit endpoints
router.get('/visits/:visitId', requireRole(['Admin', 'Doctor', 'Receptionist']), getVisitDetails);
router.put('/visits/:visitId', requireRole(['Admin', 'Doctor', 'Receptionist']), updateVisit);

// Deleting visit logs is restricted to Admin only
router.delete('/visits/:visitId', requireRole(['Admin']), deleteVisit);

export default router;
