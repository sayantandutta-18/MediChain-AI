import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from '../validators/notificationValidators';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listNotificationsSchema }), notificationController.listMine);
router.get('/summary', notificationController.summary);
router.post('/read-all', notificationController.markAllRead);
router.post('/:notificationId/read', validate({ params: notificationIdParamSchema }), notificationController.markRead);
router.delete('/:notificationId', validate({ params: notificationIdParamSchema }), notificationController.remove);

export default router;