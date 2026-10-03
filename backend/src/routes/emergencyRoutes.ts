import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as emergencyController from '../controllers/emergencyController';

const router = Router();

// Public route for paramedics scanning the QR
router.get('/access/:token', emergencyController.accessByToken);

// Protected routes for patients to manage their emergency profile
router.use(authenticate);
router.use(authorize('patient'));

router.get('/', emergencyController.getProfile);
router.put('/', emergencyController.updateProfile);
router.post('/share', emergencyController.generateToken);

export default router;
