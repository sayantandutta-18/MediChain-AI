import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import * as notificationService from '../services/notificationService';
import { recordAuditEvent } from '../services/auditLogService';
import { ApiError } from '../utils/ApiError';
import { listNotificationsSchema } from '../validators/notificationValidators';
import { pathParam } from '../utils/request';

/**
 * Feature 02 — Notification Center controller.
 * Every handler scopes to the authenticated user; no recipient is accepted from
 * the client.
 */
export const listMine = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = listNotificationsSchema.parse(req.query);

  const result = await notificationService.listNotifications(user.id, {
    page: input.page,
    limit: input.limit,
    unreadOnly: input.unreadOnly,
  });

  res.json({ success: true, data: result });
});

export const summary = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  res.json({ success: true, data: { summary: await notificationService.unreadSummary(user.id) } });
});

export const markRead = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const notificationId = pathParam(req, 'notificationId');

  const result = await notificationService.markRead(user.id, notificationId);
  if (!result) {
    throw ApiError.notFound('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }

  res.json({ success: true, data: { notification: result } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const result = await notificationService.markAllRead(user.id);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'notification.mark_all_read',
    resourceType: 'Notification',
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: result,
  });

  res.json({ success: true, data: result });
});

export const remove = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const notificationId = pathParam(req, 'notificationId');

  const deleted = await notificationService.removeNotification(user.id, notificationId);
  if (!deleted) {
    throw ApiError.notFound('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }

  res.json({ success: true, data: { deleted: true, id: notificationId } });
});