import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Prescription } from '../models/Prescription';
import { User } from '../models/User';
import { authenticate, currentUser } from '../middleware/auth';

const router = Router();

export const addPrescription = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (user.role !== 'doctor') throw new Error('Only doctors can add prescriptions');
  
  const { patientId, medicationName, dosage, frequency, startDate, endDate, notes } = req.body;
  if (!patientId || !medicationName) throw new Error('Patient ID and medication name required');

  const prescription = await Prescription.create({
    patientId,
    doctorId: user.id,
    medicationName,
    dosage,
    frequency,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : undefined,
    notes,
  });

  res.json({ success: true, data: prescription });
});

export const getPrescriptions = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const filter = user.role === 'patient' ? { patientId: user.id } : { doctorId: user.id };
  const prescriptions = await Prescription.find(filter)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
});

export const updatePrescriptionStatus = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { status } = req.body;
  
  const filter = user.role === 'patient' ? { patientId: user.id, _id: req.params.id } : { doctorId: user.id, _id: req.params.id };
  
  const prescription = await Prescription.findOneAndUpdate(
    filter,
    { status },
    { new: true }
  );
  if (!prescription) throw new Error('Prescription not found or unauthorized');
  
  res.json({ success: true, data: prescription });
});

router.post('/', authenticate, addPrescription);
router.get('/', authenticate, getPrescriptions);
router.patch('/:id/status', authenticate, updatePrescriptionStatus);

export default router;
