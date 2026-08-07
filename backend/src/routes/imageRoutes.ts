import { Router } from 'express';
import { 
  uploadMiddleware, 
  uploadImages, 
  uploadPatientFiles,
  getVisitImages, 
  getPatientImages, 
  updateImageDescription, 
  deleteImage, 
  serveImage 
} from '../controllers/imageController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all image routes require authentication
router.use(authenticateToken);

// 1. Secured file server route (accessible by any authenticated user)
router.get('/images/serve/:imageId', serveImage);

// 2. Read-only gallery endpoints (accessible by Admin, Doctor, and Receptionist)
router.get('/visits/:visitId/images', getVisitImages);
router.get('/patients/:patientId/images', getPatientImages);

// 3. Write actions (restricted to Admin and Doctor roles only)
router.post('/visits/:visitId/images', requireRole(['Admin', 'Doctor']), uploadMiddleware, uploadImages);
router.post('/patients/:patientId/files', requireRole(['Admin', 'Doctor']), uploadMiddleware, uploadPatientFiles);
router.put('/images/:imageId', requireRole(['Admin', 'Doctor']), updateImageDescription);
router.delete('/images/:imageId', requireRole(['Admin', 'Doctor']), deleteImage);

export default router;
