import { AccessRequest, type IAccessRequest } from '../models/AccessRequest';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { listAccessiblePatientIds } from './accessControlService';
import type { AuthenticatedUser, AccessRequestStatus } from '../types';
import type {
  CreateAccessRequestInput,
  DecideAccessRequestInput,
  ListAccessRequestsInput,
} from '../validators/accessRequestValidators';

const DAY_MS = 24 * 60 * 60 * 1000;

const populateRequest = async (request: IAccessRequest) => {
  const [doctor, patient] = await Promise.all([
    User.findById(request.doctor).select('name email specialty hospital registrationNumber').lean(),
    User.findById(request.patient).select('name email').lean(),
  ]);

  return {
    id: request._id.toString(),
    status: request.status,
    reason: request.reason,
    purpose: request.purpose ?? null,
    decisionNote: request.decisionNote ?? null,
    requestedAt: request.requestedAt,
    decidedAt: request.decidedAt ?? null,
    approvedAt: request.approvedAt ?? null,
    expiresAt: request.expiresAt ?? null,
    revokedAt: request.revokedAt ?? null,
    expired: request.status === 'APPROVED' && Boolean(request.expiresAt && request.expiresAt.getTime() <= Date.now()),
    doctor: doctor
      ? {
          id: doctor._id.toString(),
          name: doctor.name,
          email: doctor.email,
          specialty: doctor.specialty ?? null,
          hospital: doctor.hospital ?? null,
          registrationNumber: doctor.registrationNumber ?? null,
        }
      : null,
    patient: patient ? { id: patient._id.toString(), name: patient.name, email: patient.email } : null,
    createdAt: request.createdAt,
  };
};

export const createAccessRequest = async (
  doctor: AuthenticatedUser,
  input: CreateAccessRequestInput,
) => {
  const patient = await User.findById(input.patientId);
  if (!patient) throw ApiError.notFound('Patient not found.', 'PATIENT_NOT_FOUND');
  if (patient.role !== 'patient') {
    throw ApiError.badRequest('Access can only be requested from a patient account.', 'TARGET_NOT_PATIENT');
  }
  if (patient._id.toString() === doctor.id) {
    throw ApiError.badRequest('You cannot request access to your own account.', 'SELF_REQUEST');
  }

  const existing = await AccessRequest.findOne({
    doctor: doctor.id,
    patient: patient._id,
    status: { $in: ['PENDING', 'APPROVED'] },
  });
  if (existing) {
    throw ApiError.conflict(
      existing.status === 'PENDING'
        ? 'You already have a pending request with this patient.'
        : 'You already have approved access to this patient.',
      'ACCESS_REQUEST_EXISTS',
      { status: existing.status, expiresAt: existing.expiresAt ?? null },
    );
  }

  const created = await AccessRequest.create({
    doctor: doctor.id,
    patient: patient._id,
    reason: input.reason,
    purpose: input.purpose,
    status: 'PENDING',
  });

  return populateRequest(created);
};

/** Patient inbox + doctor outbox share one shape (TRD-9/TRD-11). */
export const listAccessRequests = async (
  user: AuthenticatedUser,
  input: ListAccessRequestsInput,
  scope: 'patient' | 'doctor' = user.role,
) => {
  const filter: Record<string, unknown> = { [scope]: user.id };
  if (input.status) filter.status = input.status;

  const skip = (input.page - 1) * input.limit;
  const [requests, total] = await Promise.all([
    AccessRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit),
    AccessRequest.countDocuments(filter),
  ]);

  return {
    items: await Promise.all(requests.map(populateRequest)),
    pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) || 1 },
  };
};

const loadPendingRequest = async (patientId: string, requestId: string) => {
  const request = await AccessRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Access request not found.', 'ACCESS_REQUEST_NOT_FOUND');

  if (request.patient.toString() !== patientId) {
    throw ApiError.forbidden('Only the targeted patient can decide this request.', {
      code: 'NOT_REQUEST_OWNER',
    });
  }
  if (request.status !== 'PENDING') {
    throw ApiError.conflict(
      `This request has already been ${request.status.toLowerCase()}.`,
      'REQUEST_ALREADY_DECIDED',
      { status: request.status },
    );
  }
  return request;
};

/** Approval creates a time bounded relationship (TRD-9). */
export const decideAccessRequest = async (
  patientId: string,
  requestId: string,
  input: DecideAccessRequestInput,
) => {
  const request = await loadPendingRequest(patientId, requestId);

  request.decidedAt = new Date();
  request.decisionNote = input.decisionNote;

  if (input.action === 'APPROVE') {
    request.status = 'APPROVED';
    request.approvedAt = new Date();
    request.expiresAt = new Date(Date.now() + (input.durationDays as number) * DAY_MS);
  } else {
    request.status = 'REJECTED';
  }

  await request.save();
  return populateRequest(request);
};

export const revokeAccess = async (patientId: string, requestId: string, reason?: string) => {
  const request = await AccessRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Access request not found.', 'ACCESS_REQUEST_NOT_FOUND');

  if (request.patient.toString() !== patientId) {
    throw ApiError.forbidden('Only the patient who granted access can revoke it.', {
      code: 'NOT_REQUEST_OWNER',
    });
  }
  if (request.status !== 'APPROVED') {
    throw ApiError.conflict(
      `Only an approved relationship can be revoked (current status: ${request.status}).`,
      'REQUEST_NOT_APPROVED',
      { status: request.status },
    );
  }

  request.status = 'REVOKED';
  request.revokedAt = new Date();
  request.decidedAt = new Date();
  if (reason) request.decisionNote = reason;
  await request.save();

  return populateRequest(request);
};

/** PRD-3: approved patient relationships visible to the doctor. */
export const listDoctorRelationships = async (doctor: AuthenticatedUser) => {
  const requests = await AccessRequest.find({ doctor: doctor.id, status: 'APPROVED' })
    .sort({ approvedAt: -1 })
    .limit(200);

  return Promise.all(
    requests.map(async (request) => {
      const enriched = await populateRequest(request);
      return { ...enriched, expired: enriched.expired };
    }),
  );
};

export const listPatientRelationships = async (patient: AuthenticatedUser) => {
  const requests = await AccessRequest.find({ patient: patient.id, status: 'APPROVED' })
    .sort({ approvedAt: -1 })
    .limit(200);
  return Promise.all(requests.map(populateRequest));
};

export const accessRequestStats = async (user: AuthenticatedUser) => {
  const filter: Record<string, unknown> = { [user.role]: user.id };
  const [pending, approved, rejected, revoked, accessiblePatients] = await Promise.all([
    AccessRequest.countDocuments({ ...filter, status: 'PENDING' }),
    AccessRequest.countDocuments({
      ...filter,
      status: 'APPROVED',
      expiresAt: { $gt: new Date() },
    }),
    AccessRequest.countDocuments({ ...filter, status: 'REJECTED' }),
    AccessRequest.countDocuments({ ...filter, status: 'REVOKED' }),
    user.role === 'doctor' ? listAccessiblePatientIds(user.id) : Promise.resolve([]),
  ]);

  return { pending, approved, rejected, revoked, accessiblePatients: accessiblePatients.length };
};

export const findActiveRelationship = async (userId: string, otherUserId: string): Promise<AccessRequestStatus | null> => {
  const request = await AccessRequest.findOne({
    $or: [
      { doctor: userId, patient: otherUserId },
      { doctor: otherUserId, patient: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
  return request?.status ?? null;
};
