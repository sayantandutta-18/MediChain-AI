import { z } from 'zod';

/**
 * Feature 02 — Notification Center validators.
 *
 * Note there is no `recipientId` field anywhere: the recipient is always taken
 * from the authenticated identity, so a caller can never address a
 * notification to somebody else.
 */
export const listNotificationsSchema = z.object({
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().regex(/^[a-f\d]{24}$/i, 'A valid notification id is required'),
});