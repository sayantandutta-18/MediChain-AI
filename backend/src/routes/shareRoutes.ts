import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as shareController from '../controllers/shareController';

const router = Router();

// Public routes for accessing a record via link
router.get('/access/:token', shareController.accessRecordByToken);
router.get('/access/:token/download', shareController.downloadRecordByToken);

// Protected routes for patients to generate share links
router.use(authenticate);
router.use(authorize('patient'));
router.post('/generate', shareController.generateRecordToken);

export default router;
