import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { analyzeRecordSchema } from '../validators/aiValidators';

const router = Router();

router.use(authenticate);

router.get('/status', aiController.status);
router.post('/analyze', validate({ body: analyzeRecordSchema }), aiController.analyze);
router.get('/timeline', aiController.generateTimeline);

export default router;

router.post('/compare', authenticate, aiController.compareRecords);
