import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as securityController from '../controllers/securityController';

const router = Router();

// All security routes require authentication
router.use(authenticate);

router.get('/events', securityController.getMySecurityEvents);

export const securityRoutes = router;
