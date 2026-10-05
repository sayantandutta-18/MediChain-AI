import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Hospital } from '../models/Hospital';
import { authenticate } from '../middleware/auth';

const router = Router();

export const listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await Hospital.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: hospitals });
});

export const getHospital = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.params.id);
  if (!hospital || !hospital.isActive) {
    res.status(404);
    throw new Error('Hospital not found');
  }
  res.json({ success: true, data: hospital });
});

router.get('/', authenticate, listHospitals);
router.get('/:id', authenticate, getHospital);

export default router;
