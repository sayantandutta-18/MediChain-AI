import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import * as auditLogService from '../services/auditLogService';
import { recordAuditEvent } from '../services/auditLogService';
import type { AuditAction } from '../models/AuditLog';

const querySchema = z.object({
  action: z.string().trim().max(60).optional(),
  result: z.enum(['SUCCESS', 'FAILURE']).optional(),
  resourceId: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * TRD-10: audit endpoints have their own authorization - a caller only ever
 * sees the trail of their own actions.
 */
export const listLogs = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = querySchema.parse(req.query);

  const result = await auditLogService.listAuditLogs({
    actorId: user.id,
    action: input.action as AuditAction | undefined,
    result: input.result,
    resourceId: input.resourceId,
    page: input.page,
    limit: input.limit,
  });

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'audit.view',
    resourceType: 'AuditLog',
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { returned: result.items.length },
  });

  res.json({ success: true, data: result });
});
