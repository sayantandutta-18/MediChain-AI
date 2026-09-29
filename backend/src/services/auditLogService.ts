import type { FilterQuery } from 'mongoose';
import { AuditLog, type AuditAction, type IAuditLog } from '../models/AuditLog';
import type { AuditResult, UserRole } from '../types/enums';
import { logger } from '../utils/logger';

export interface RecordAuditInput {
  actorId?: string;
  actorRole?: UserRole;
  actorEmail?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  result?: AuditResult;
  statusCode?: number;
  reason?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * TRD-10: append-only audit trail. Never throws - an audit failure must not
 * break the business operation that produced it, but it is always logged.
 */
export const recordAuditEvent = async (input: RecordAuditInput): Promise<IAuditLog | null> => {
  try {
    return await AuditLog.create({
      actor: input.actorId,
      actorRole: input.actorRole,
      actorEmail: input.actorEmail,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      result: input.result ?? 'SUCCESS',
      statusCode: input.statusCode,
      reason: input.reason,
      ip: input.ip,
      userAgent: input.userAgent,
      requestId: input.requestId,
      metadata: input.metadata,
    });
  } catch (error) {
    logger.error(`Failed to persist audit event "${input.action}"`, error);
    return null;
  }
};

export interface ListAuditInput {
  actorId?: string;
  action?: AuditAction;
  resourceId?: string;
  result?: AuditResult;
  page: number;
  limit: number;
}

/** TRD-10: audit endpoints have their own authorization (patient = own trail, doctor = own trail). */
export const listAuditLogs = async (input: ListAuditInput) => {
  const filter: FilterQuery<IAuditLog> = {};

  if (input.actorId) filter.actor = input.actorId;
  if (input.action) filter.action = input.action;
  if (input.resourceId) filter.resourceId = input.resourceId;
  if (input.result) filter.result = input.result;

  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      action: item.action,
      actorRole: item.actorRole ?? null,
      resourceType: item.resourceType ?? null,
      resourceId: item.resourceId ?? null,
      result: item.result,
      statusCode: item.statusCode ?? null,
      reason: item.reason ?? null,
      ip: item.ip ?? null,
      metadata: item.metadata ?? null,
      createdAt: item.createdAt,
    })),
    pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) || 1 },
  };
};
