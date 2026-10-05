import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as securityController from '../controllers/securityController';

const router = Router();

// All security routes require authentication
router.use(authenticate);

router.get('/events', securityController.getMySecurityEvents);
router.get('/privacy-dashboard', securityController.getPrivacyDashboard);
router.post('/privacy-dashboard/revoke-all', securityController.revokeAllAccess);

export const securityRoutes = router;

router.post('/rotate-keys', authenticate, securityController.rotateEncryptionKeys);
