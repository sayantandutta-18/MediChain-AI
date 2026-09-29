import { Router } from 'express';
import { z } from 'zod';
import * as accessRequestController from '../controllers/accessRequestController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createAccessRequestSchema,
  decideAccessRequestSchema,
  listAccessRequestsSchema,
  revokeAccessSchema,
} from '../validators/accessRequestValidators';

const router = Router();
const requestIdParam = z.object({ requestId: z.string().regex(/^[a-f\d]{24}$/i, 'A valid id is required') });

router.use(authenticate);

router.get('/', validate({ query: listAccessRequestsSchema }), accessRequestController.listMine);
router.get('/stats', accessRequestController.stats);
router.get('/relationships', accessRequestController.listRelationships);

router.post(
  '/',
  authorize('doctor'),
  validate({ body: createAccessRequestSchema }),
  accessRequestController.createRequest,
);

router.post(
  '/:requestId/decision',
  validate({ params: requestIdParam, body: decideAccessRequestSchema }),
  accessRequestController.decide,
);

router.post(
  '/:requestId/revoke',
  validate({ params: requestIdParam, body: revokeAccessSchema }),
  accessRequestController.revoke,
);

export default router;
