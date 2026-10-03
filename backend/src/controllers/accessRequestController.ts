import { logSecurityEvent } from '../services/securityEventService';
import { asyncHandler } from '../utils/asyncHandler';
import { pathParam } from '../utils/request';
import { currentUser } from '../middleware/auth';
import * as accessRequestService from '../services/accessRequestService';
import { recordAuditEvent } from '../services/auditLogService';
import { createNotification } from '../services/notificationService';
import { ApiError } from '../utils/ApiError';
import {
  createAccessRequestSchema,
  decideAccessRequestSchema,
  listAccessRequestsSchema,
  revokeAccessSchema,
} from '../validators/accessRequestValidators';

export const createRequest = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (user.role !== 'doctor') {
    throw ApiError.forbidden('Only doctor accounts can request access to patient records.', {
      code: 'DOCTOR_ROLE_REQUIRED',
    });
  }

  const input = createAccessRequestSchema.parse(req.body);
  const request = await accessRequestService.createAccessRequest(user, input);

  // Notify the patient that a doctor is asking for access.
  await createNotification({
    recipientId: input.patientId,
    type: 'access.requested',
    severity: 'warning',
    title: 'New access request',
    body: `${user.name} requested access to your records.`,
    resourceType: 'AccessRequest',
    resourceId: request.id,
    link: '/access-requests',
  });

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'access.request',
    resourceType: 'AccessRequest',
    resourceId: request.id,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { patientId: input.patientId },
  });

  res.status(201).json({ success: true, data: { accessRequest: request } });
});

export const listMine = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = listAccessRequestsSchema.parse(req.query);
  const result = await accessRequestService.listAccessRequests(user, input);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'access.list',
    resourceType: 'AccessRequest',
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { returned: result.items.length },
  });

  res.json({ success: true, data: result });
});

export const decide = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (user.role !== 'patient') {
    throw ApiError.forbidden('Only the patient can approve or reject an access request.', {
      code: 'PATIENT_ROLE_REQUIRED',
    });
  }

  const input = decideAccessRequestSchema.parse(req.body);
  const request = await accessRequestService.decideAccessRequest(user.id, pathParam(req, 'requestId'), input);

  // Tell the doctor how the patient decided.
  if (request.doctor?.id) {
    await createNotification({
      recipientId: request.doctor.id,
      type: input.action === 'APPROVE' ? 'access.approved' : 'access.rejected',
      severity: input.action === 'APPROVE' ? 'success' : 'info',
      title: input.action === 'APPROVE' ? 'Access approved' : 'Access rejected',
      body:
        input.action === 'APPROVE'
          ? `You can now view this patient's records${
              request.expiresAt ? ` until ${new Date(request.expiresAt).toDateString()}` : ''
            }.`
          : 'The patient declined your access request.',
      resourceType: 'AccessRequest',
      resourceId: request.id,
      link: '/access-requests',
    });
  }

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: input.action === 'APPROVE' ? 'access.approve' : 'access.reject',
    resourceType: 'AccessRequest',
    resourceId: request.id,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { doctorId: request.doctor?.id, expiresAt: request.expiresAt, durationDays: input.durationDays },
  });

  res.json({ success: true, data: { accessRequest: request } });
});

export const revoke = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (user.role !== 'patient') {
    throw ApiError.forbidden('Only the patient can revoke granted access.', { code: 'PATIENT_ROLE_REQUIRED' });
  }

  const input = revokeAccessSchema.parse(req.body ?? {});
  const request = await accessRequestService.revokeAccess(user.id, pathParam(req, 'requestId'), input.reason);

  await logSecurityEvent({
    userId: user.id,
    type: 'CONSENT_REVOKED',
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    severity: 'medium',
    details: { doctorId: request.doctor?.id, requestId: request.id },
  });

  // Revocation must be visible to the doctor immediately.
  if (request.doctor?.id) {
    await createNotification({
      recipientId: request.doctor.id,
      type: 'access.revoked',
      severity: 'warning',
      title: 'Access revoked',
      body: 'The patient revoked your access to their records.',
      resourceType: 'AccessRequest',
      resourceId: request.id,
      link: '/access-requests',
    });
  }

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'access.revoke',
    resourceType: 'AccessRequest',
    resourceId: request.id,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { doctorId: request.doctor?.id },
  });

  res.json({ success: true, data: { accessRequest: request } });
});

export const listRelationships = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const result =
    user.role === 'doctor'
      ? await accessRequestService.listDoctorRelationships(user)
      : await accessRequestService.listPatientRelationships(user);
  res.json({ success: true, data: { relationships: result } });
});

export const stats = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  res.json({ success: true, data: { stats: await accessRequestService.accessRequestStats(user) } });
});
