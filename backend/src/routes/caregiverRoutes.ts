import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { CaregiverAccess } from '../models/CaregiverAccess';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { currentUser } from '../middleware/auth';

const router = Router();

export const addCaregiver = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { email, relation } = req.body;
  if (!email || !relation) throw new Error('Email and relation are required');

  const caregiverUser = await User.findOne({ email });
  if (!caregiverUser) throw new Error('User not found');

  const access = await CaregiverAccess.findOneAndUpdate(
    { patientId: user.id, caregiverId: caregiverUser._id },
    { relation, isActive: true },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: access });
});

export const getMyCaregivers = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const caregivers = await CaregiverAccess.find({ patientId: user.id, isActive: true }).populate('caregiverId', 'name email');
  res.json({ success: true, data: caregivers });
});

export const removeCaregiver = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  await CaregiverAccess.findOneAndUpdate(
    { patientId: user.id, caregiverId: req.params.id },
    { isActive: false }
  );
  res.json({ success: true, message: 'Caregiver removed' });
});

router.post('/', authenticate, addCaregiver);
router.get('/', authenticate, getMyCaregivers);
router.delete('/:id', authenticate, removeCaregiver);

export default router;
