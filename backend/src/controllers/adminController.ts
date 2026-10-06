import type { Request, Response, NextFunction } from 'express';
import { User, type IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { ApiError } from '../utils/ApiError';
import { DOCTOR_VERIFICATION_STATUSES } from '../types/enums';
import { z } from 'zod';
import { createNotification } from '../services/notificationService';

const verifyDoctorSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
});

export const getPendingDoctors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doctors = await User.find({ role: 'doctor', verificationStatus: 'PENDING' }).sort({ createdAt: -1 });
    res.json({ success: true, data: doctors.map((d: IUser) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      role: d.role,
      specialty: d.specialty,
      registrationNumber: d.registrationNumber,
      hospital: d.hospital,
      experience: d.experience,
      verificationStatus: d.verificationStatus,
      createdAt: d.createdAt,
    })) });
  } catch (error) {
    next(error);
  }
};

export const verifyDoctor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = verifyDoctorSchema.parse(req.body);

    const doctor = await User.findOne({ _id: id, role: 'doctor' });
    if (!doctor) {
      throw ApiError.notFound('Doctor not found');
    }

    if (doctor.verificationStatus === body.status) {
      throw ApiError.badRequest(`Doctor is already ${body.status}`);
    }

    doctor.verificationStatus = body.status;
    await doctor.save();

    await AuditLog.create({
      actor: req.user!.id,
      action: 'admin.verify_doctor',
      resource: doctor._id.toString(),
      resourceModel: 'User',
      details: {
        newStatus: body.status,
        notes: body.notes
      },
      status: 'SUCCESS'
    });

    // Notify the doctor
    await createNotification({
      recipientId: doctor._id.toString(),
      type: 'verification.completed',
      severity: body.status === 'VERIFIED' ? 'success' : 'warning',
      title: 'Verification Status Updated',
      body: `Your doctor profile verification status is now ${body.status}.`,
    });

    res.json({ success: true, data: {
      id: doctor._id.toString(),
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      specialty: doctor.specialty,
      registrationNumber: doctor.registrationNumber,
      hospital: doctor.hospital,
      experience: doctor.experience,
      verificationStatus: doctor.verificationStatus,
      createdAt: doctor.createdAt,
    } });
  } catch (error) {
    next(error);
  }
};
