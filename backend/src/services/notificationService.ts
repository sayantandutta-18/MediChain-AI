import mongoose from 'mongoose';
import { Notification, type NotificationSeverity, type NotificationType } from '../models/Notification';
import { logger } from '../utils/logger';
import type { Paginated } from '../types/pagination';

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body?: string;
  severity?: NotificationSeverity;
  resourceType?: string;
  resourceId?: string;
  link?: string;
}

export interface ListNotificationsInput {
  unreadOnly?: boolean;
  page: number;
  limit: number;
}

export interface UnreadSummary {
  unread: number;
  latest: {
    id: string;
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    link: string | null;
    createdAt: Date;
  } | null;
}

/**
 * Feature 02 — Notification Center service.
 *
 * Every read/mutate path is scoped to `recipientId`. A caller can never read,
 * mark-read or delete somebody else's notification because the recipient id is
 * taken from the authenticated identity, never from the request body.
 */
export const createNotification = async (input: CreateNotificationInput) => {
  try {
    return await Notification.create({
      recipient: new mongoose.Types.ObjectId(input.recipientId),
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      link: input.link,
    });
  } catch (error) {
    // A failed notification must never break the business action that caused it.
    logger.error(`Failed to create notification "${input.type}"`, error);
    return null;
  }
};

export const listNotifications = async (
  recipientId: string,
  input: ListNotificationsInput,
): Promise<Paginated<Record<string, unknown>>> => {
  const filter: Record<string, unknown> = { recipient: recipientId };
  if (input.unreadOnly) filter.readAt = { $exists: false };

  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit).lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      severity: item.severity,
      title: item.title,
      body: item.body ?? null,
      resourceType: item.resourceType ?? null,
      resourceId: item.resourceId ?? null,
      link: item.link ?? null,
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
      readAt: item.readAt ?? null,
    })),
    pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) || 1 },
  };
};

export const unreadSummary = async (recipientId: string): Promise<UnreadSummary> => {
  const [unread, latest] = await Promise.all([
    Notification.countDocuments({ recipient: recipientId, readAt: { $exists: false } }),
    Notification.findOne({ recipient: recipientId }).sort({ createdAt: -1 }).lean(),
  ]);

  return {
    unread,
    latest: latest
      ? {
          id: latest._id.toString(),
          type: latest.type,
          severity: latest.severity,
          title: latest.title,
          link: latest.link ?? null,
          createdAt: latest.createdAt,
        }
      : null,
  };
};

/** Scoped by recipient, so another user cannot mark this notification read. */
export const markRead = async (recipientId: string, notificationId: string) => {
  if (!mongoose.isValidObjectId(notificationId)) return null;
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { $set: { readAt: new Date() } },
    { new: true },
  ).lean();
  return notification ? { id: notification._id.toString(), read: true, readAt: notification.readAt } : null;
};

export const markAllRead = async (recipientId: string) => {
  const result = await Notification.updateMany(
    { recipient: recipientId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );
  return { updated: result.modifiedCount ?? 0 };
};

export const removeNotification = async (recipientId: string, notificationId: string) => {
  if (!mongoose.isValidObjectId(notificationId)) return false;
  const result = await Notification.deleteOne({ _id: notificationId, recipient: recipientId });
  return (result.deletedCount ?? 0) > 0;
};