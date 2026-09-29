import { asyncHandler } from '../utils/asyncHandler';
import { pathParam } from '../utils/request';
import { currentUser } from '../middleware/auth';
import * as recordService from '../services/recordService';
import { recordAuditEvent } from '../services/auditLogService';
import { listRecordsSchema, updateRecordSchema } from '../validators/recordValidators';

export const uploadRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const file = req.file!;

  const record = await recordService.createRecord(user.id, req.body, file);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.upload',
    resourceType: 'MedicalRecord',
    resourceId: record.recordId,
    result: 'SUCCESS',
    statusCode: 201,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { fileName: record.fileName, size: record.size, fileHash: record.fileHash },
  });

  res.status(201).json({ success: true, data: { record } });
});

export const listRecords = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = listRecordsSchema.parse(req.query);
  const result = await recordService.listRecords(user, input);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.list',
    resourceType: 'MedicalRecord',
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { page: input.page, limit: input.limit, returned: result.items.length },
  });

  res.json({ success: true, data: result });
});

export const getRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const recordId = pathParam(req, 'recordId');
  const record = await recordService.getRecord(user, recordId);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.view',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
  });

  res.json({ success: true, data: { record } });
});

export const downloadRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const recordId = pathParam(req, 'recordId');
  const file = await recordService.downloadRecord(user, recordId);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.download',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { fileName: file.fileName },
  });

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.buffer.length));
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(file.buffer);
});

export const updateRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const recordId = pathParam(req, 'recordId');
  const input = updateRecordSchema.parse(req.body);

  const record = await recordService.updateRecord(user, recordId, input);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.update',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
  });

  res.json({ success: true, data: { record } });
});

export const deleteRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const recordId = pathParam(req, 'recordId');

  const result = await recordService.deleteRecord(user, recordId);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.delete',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
  });

  res.json({ success: true, data: result });
});

export const verifyRecord = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const recordId = pathParam(req, 'recordId');
  const report = await recordService.verifyIntegrity(user, recordId);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'record.verify',
    resourceType: 'MedicalRecord',
    resourceId: recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { verificationStatus: report.status },
  });

  res.json({ success: true, data: { verification: report } });
});

export const getStats = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  res.json({ success: true, data: { stats: await recordService.recordStats(user) } });
});
