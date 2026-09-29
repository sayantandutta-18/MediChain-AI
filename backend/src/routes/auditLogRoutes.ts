import { Router } from 'express';
import * as auditLogController from '../controllers/auditLogController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', auditLogController.listLogs);

export default router;
