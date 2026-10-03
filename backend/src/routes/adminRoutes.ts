import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/doctors/pending', adminController.getPendingDoctors);
router.post('/doctors/:id/verify', adminController.verifyDoctor);

export default router;
