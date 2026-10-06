import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Appointment } from '../models/Appointment';
import { User } from '../models/User';
import { authenticate, currentUser } from '../middleware/auth';

const router = Router();

export const scheduleAppointment = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { doctorId, date, notes } = req.body;
  if (!doctorId || !date) throw new Error('Doctor and date are required');

  const appointment = await Appointment.create({
    patientId: user.id,
    doctorId,
    date: new Date(date),
    notes,
  });

  res.json({ success: true, data: appointment });
});

export const getAppointments = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const filter = user.role === 'patient' ? { patientId: user.id } : { doctorId: user.id };
  const appointments = await Appointment.find(filter)
    .populate('patientId', 'name email')
    .populate('doctorId', 'name email')
    .sort({ date: 1 });
  res.json({ success: true, data: appointments });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { status } = req.body;
  
  const filter = user.role === 'patient' ? { patientId: user.id, _id: req.params.id } : { doctorId: user.id, _id: req.params.id };
  
  const appointment = await Appointment.findOneAndUpdate(
    filter,
    { status },
    { new: true }
  );
  if (!appointment) throw new Error('Appointment not found or unauthorized');
  
  res.json({ success: true, data: appointment });
});

router.post('/', authenticate, scheduleAppointment);
router.get('/', authenticate, getAppointments);
router.patch('/:id/status', authenticate, updateAppointmentStatus);

export default router;
