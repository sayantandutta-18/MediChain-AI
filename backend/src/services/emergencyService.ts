import crypto from 'crypto';
import { EmergencyProfile, type IEmergencyProfile } from '../models/EmergencyProfile';
import { ShareToken } from '../models/ShareToken';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import type { AuthenticatedUser } from '../types';

export interface UpdateEmergencyProfileInput {
  bloodGroup?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  organDonor?: boolean;
  primaryDoctor?: string;
}

export const getEmergencyProfile = async (patientId: string) => {
  let profile = await EmergencyProfile.findOne({ patient: patientId });
  if (!profile) {
    profile = await EmergencyProfile.create({ patient: patientId });
  }
  return profile;
};

export const updateEmergencyProfile = async (
  patient: AuthenticatedUser,
  input: UpdateEmergencyProfileInput
) => {
  if (patient.role !== 'patient') {
    throw ApiError.forbidden('Only patients can have an emergency profile.');
  }

  let profile = await EmergencyProfile.findOne({ patient: patient.id });
  if (!profile) {
    profile = new EmergencyProfile({ patient: patient.id });
  }

  if (input.bloodGroup !== undefined) profile.bloodGroup = input.bloodGroup;
  if (input.allergies !== undefined) profile.allergies = input.allergies;
  if (input.medications !== undefined) profile.medications = input.medications;
  if (input.conditions !== undefined) profile.conditions = input.conditions;
  if (input.emergencyContactName !== undefined) profile.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) profile.emergencyContactPhone = input.emergencyContactPhone;
  if (input.organDonor !== undefined) profile.organDonor = input.organDonor;
  if (input.primaryDoctor !== undefined) profile.primaryDoctor = input.primaryDoctor;

  await profile.save();
  return profile;
};

export const generateEmergencyToken = async (patientId: string, durationHours: number = 24) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const shareToken = await ShareToken.create({
    token,
    type: 'EMERGENCY',
    patient: patientId,
    expiresAt,
  });

  return { token, expiresAt: shareToken.expiresAt };
};

export const getProfileByToken = async (token: string) => {
  const shareToken = await ShareToken.findOne({ token, type: 'EMERGENCY' });
  
  if (!shareToken) throw ApiError.notFound('Invalid emergency token.');
  if (shareToken.isRevoked) throw ApiError.forbidden('This emergency link has been revoked.');
  if (shareToken.expiresAt < new Date()) throw ApiError.forbidden('This emergency link has expired.');

  const profile = await EmergencyProfile.findOne({ patient: shareToken.patient });
  if (!profile) throw ApiError.notFound('Emergency profile not found.');

  const user = await User.findById(shareToken.patient).select('name');

  return {
    patientName: user?.name,
    profile: (profile as any).toPublicJSON(),
    patientId: shareToken.patient.toString(),
  };
};
