import { Router } from 'express';
import * as recordController from '../controllers/recordController';
import { authenticate, authorize } from '../middleware/auth';
import { receiveMedicalFile } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { listRecordsSchema, recordIdParamSchema, updateRecordSchema, uploadRecordSchema } from '../validators/recordValidators';

const router = Router();

router.use(authenticate);

// All record routes are for authenticated users; RBAC/ownership is enforced in the service layer.
router.get('/', validate({ query: listRecordsSchema }), recordController.listRecords);
router.get('/stats', recordController.getStats);

router.post(
  '/',
  authorize('patient'),
  receiveMedicalFile,
  validate({ body: uploadRecordSchema }),
  recordController.uploadRecord,
);

router.get('/:recordId', validate({ params: recordIdParamSchema }), recordController.getRecord);
router.get('/:recordId/download', validate({ params: recordIdParamSchema }), recordController.downloadRecord);
router.get('/:recordId/verify', validate({ params: recordIdParamSchema }), recordController.verifyRecord);
router.patch(
  '/:recordId',
  validate({ params: recordIdParamSchema, body: updateRecordSchema }),
  recordController.updateRecord,
);
router.delete('/:recordId', validate({ params: recordIdParamSchema }), recordController.deleteRecord);

export default router;
