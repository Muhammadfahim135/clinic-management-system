import { Router } from 'express';
import {
  createBill,
  updateBill,
  getBillDetails,
  getPatientBills,
  addBillItem,
  recordPayment,
  getPaymentHistory,
  deleteBill,
  getGlobalBills,
  getVisitBill
} from '../controllers/billingController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Ensure all billing routes require authentication
router.use(authenticateToken);

// Read-only endpoints (Accessible by Admin, Doctor, and Receptionist)
router.get('/', requireRole(['Admin', 'Doctor', 'Receptionist']), getGlobalBills);
router.get('/visit/:visitId', requireRole(['Admin', 'Doctor', 'Receptionist']), getVisitBill);
router.get('/:id', requireRole(['Admin', 'Doctor', 'Receptionist']), getBillDetails);
router.get('/patient/:patientId', requireRole(['Admin', 'Doctor', 'Receptionist']), getPatientBills);
router.get('/:id/payments', requireRole(['Admin', 'Doctor', 'Receptionist']), getPaymentHistory);

// Write/Mutation endpoints (Restricted to Admin and Receptionist only)
router.post('/', requireRole(['Admin', 'Receptionist']), createBill);
router.put('/:id', requireRole(['Admin', 'Receptionist']), updateBill);
router.delete('/:id', requireRole(['Admin', 'Receptionist']), deleteBill);
router.post('/:id/payments', requireRole(['Admin', 'Receptionist']), recordPayment);
router.post('/:id/items', requireRole(['Admin', 'Receptionist']), addBillItem);

export default router;
