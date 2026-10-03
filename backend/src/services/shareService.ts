import crypto from 'crypto';
import { ShareToken } from '../models/ShareToken';
import { MedicalRecord } from '../models/MedicalRecord';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import type { AuthenticatedUser } from '../types';
import { decryptPayload } from '../utils/encryption';
import { toRecordSummary } from './recordService';

export const generateRecordShareToken = async (
  patient: AuthenticatedUser,
  recordId: string,
  durationHours: number = 24
) => {
  if (patient.role !== 'patient') {
    throw ApiError.forbidden('Only patients can generate share links.');
  }

  // Ensure record belongs to patient
  const record = await MedicalRecord.findOne({
    recordId,
    patient: patient.id
  });

  if (!record) {
    throw ApiError.notFound('Record not found or not owned by you.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const shareToken = await ShareToken.create({
    token,
    type: 'RECORD',
    patient: patient.id,
    recordId: record._id,
    expiresAt,
  });

  return { token, expiresAt: shareToken.expiresAt };
};

export const getRecordByToken = async (token: string) => {
  const shareToken = await ShareToken.findOne({ token, type: 'RECORD' });

  if (!shareToken) throw ApiError.notFound('Invalid share token.');
  if (shareToken.isRevoked) throw ApiError.forbidden('This share link has been revoked.');
  if (shareToken.expiresAt < new Date()) throw ApiError.forbidden('This share link has expired.');

  const record = await MedicalRecord.findOne({
    _id: shareToken.recordId,
    patient: shareToken.patient
  });

  if (!record) throw ApiError.notFound('Record no longer available.');

  const patient = await User.findById(shareToken.patient).select('name');

  return {
    patientName: patient?.name,
    record: toRecordSummary(record as any),
    recordId: record._id.toString(),
  };
};

export const downloadRecordByToken = async (token: string) => {
  const shareToken = await ShareToken.findOne({ token, type: 'RECORD' });

  if (!shareToken) throw ApiError.notFound('Invalid share token.');
  if (shareToken.isRevoked) throw ApiError.forbidden('This share link has been revoked.');
  if (shareToken.expiresAt < new Date()) throw ApiError.forbidden('This share link has expired.');

  const record = await MedicalRecord.findOne({
    _id: shareToken.recordId,
    patient: shareToken.patient
  }).select('+encryptedFile');

  if (!record) throw ApiError.notFound('Record no longer available.');

  const decryptedContent = decryptPayload(record.encryptedFile!);

  return {
    buffer: decryptedContent,
    fileName: record.fileName,
    mimeType: record.mimeType,
    recordId: record._id.toString()
  };
};
