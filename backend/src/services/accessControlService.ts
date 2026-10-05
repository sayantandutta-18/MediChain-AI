import { AccessRequest, type IAccessRequest } from '../models/AccessRequest';
import { MedicalRecord, type IMedicalRecord } from '../models/MedicalRecord';
import { ApiError } from '../utils/ApiError';
import type { AuthenticatedUser, UserRole } from '../types';

export type AccessDecision =
  | { granted: true; accessRequest: IAccessRequest; accessExpiresAt: Date }
  | { granted: false; reason: string; code: string; accessRequest: IAccessRequest | null };

/**
 * TRD-4: authentication alone never grants a doctor access to patient records.
 * A doctor needs an APPROVED, unexpired AccessRequest relationship.
 */
export const evaluateDoctorAccess = async (
  doctorId: string,
  patientId: string,
): Promise<AccessDecision> => {
  const accessRequest = await AccessRequest.findOne({
    doctor: doctorId,
    patient: patientId,
    status: 'APPROVED',
  })
    .sort({ approvedAt: -1 })
    .lean();

  if (!accessRequest) {
    const pending = await AccessRequest.exists({ doctor: doctorId, patient: patientId, status: 'PENDING' });
    if (pending) {
      return {
        granted: false,
        code: 'ACCESS_PENDING',
        reason: 'Your access request is still awaiting the patient’s decision.',
        accessRequest: null,
      };
    }
    return {
      granted: false,
      code: 'NO_ACCESS',
      reason: 'You do not have approved access to this patient’s records.',
      accessRequest: null,
    };
  }

  if (!accessRequest.expiresAt || new Date(accessRequest.expiresAt).getTime() <= Date.now()) {
    return {
      granted: false,
      code: 'ACCESS_EXPIRED',
      reason: 'Your access to these records has expired.',
      accessRequest,
    };
  }

  return {
    granted: true,
    accessRequest,
    accessExpiresAt: new Date(accessRequest.expiresAt as Date),
  };
};

export const authorizeDoctorAccess = async (doctorId: string, patientId: string): Promise<AccessDecision> => {
  const decision = await evaluateDoctorAccess(doctorId, patientId);
  if (!decision.granted) {
    throw ApiError.forbidden(decision.reason, { code: decision.code });
  }
  return decision;
};

/**
 * Central record access gate (TRD-4).
 * - Patients may only touch their own records.
 * - Doctors may only touch records of patients with an approved, unexpired grant.
 */
export const assertRecordAccess = async (
  user: AuthenticatedUser,
  record: Pick<IMedicalRecord, 'patient'>,
  recordIdForAudit: string,
): Promise<{ accessRequest: IAccessRequest | null }> => {
  if (user.role === 'patient') {
    if (record.patient.toString() !== user.id) {
      const { CaregiverAccess } = await import('../models/CaregiverAccess.js');
      const isCaregiver = await CaregiverAccess.exists({ caregiverId: user.id, patientId: record.patient, isActive: true });
      if (!isCaregiver) {
        throw ApiError.forbidden('You can only access your own medical records.', {
          code: 'NOT_RECORD_OWNER',
        });
      }
    }
    return { accessRequest: null };
  }

  if (user.role === 'doctor') {
    const decision = await evaluateDoctorAccess(user.id, record.patient.toString());
    if (!decision.granted) {
      throw ApiError.forbidden(decision.reason, { code: decision.code, recordId: recordIdForAudit });
    }
    return { accessRequest: decision.accessRequest };
  }

  throw ApiError.forbidden('Unsupported role.', { code: 'UNSUPPORTED_ROLE', role: user.role });
};

export const loadAuthorizedRecord = async (
  user: AuthenticatedUser,
  recordId: string,
): Promise<{ record: IMedicalRecord; accessRequest: IAccessRequest | null }> => {
  const record = await MedicalRecord.findOne({ recordId });
  if (!record) {
    throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');
  }
  const { accessRequest } = await assertRecordAccess(user, record, recordId);
  return { record, accessRequest };
};

export const assertOwner = (user: AuthenticatedUser, record: IMedicalRecord): void => {
  if (user.role !== 'patient' || record.patient.toString() !== user.id) {
    throw ApiError.forbidden('Only the owning patient can modify or delete this record.', {
      code: 'NOT_RECORD_OWNER',
    });
  }
};

export const assertSelf = (user: AuthenticatedUser, targetUserId: string, role: UserRole): void => {
  if (user.role !== role || user.id !== targetUserId) {
    throw ApiError.forbidden('You are not allowed to act on this account.');
  }
};

/** Patient ids a doctor may currently read (used to scope list endpoints). */
export const listAccessiblePatientIds = async (doctorId: string): Promise<string[]> => {
  const grants = await AccessRequest.find({
    doctor: doctorId,
    status: 'APPROVED',
    expiresAt: { $gt: new Date() },
  })
    .select('patient')
    .lean();

  return [...new Set(grants.map((grant) => grant.patient.toString()))];
};
