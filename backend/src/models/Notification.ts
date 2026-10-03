import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Feature 02 — Notification Center.
 *
 * A notification is always addressed to exactly one recipient and is readable
 * only by that recipient. It carries no medical content: only a type, a short
 * human-readable summary and opaque references, so a notification row never
 * becomes an accidental data leak.
 */
export type NotificationType =
  | 'access.requested'
  | 'access.approved'
  | 'access.rejected'
  | 'access.revoked'
  | 'record.uploaded'
  | 'security.alert'
  | 'security.login'
  | 'ai.completed'
  | 'verification.completed'
  | 'appointment.requested'
  | 'appointment.updated'
  | 'share.created'
  | 'share.accessed'
  | 'emergency.accessed';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface INotification {
  _id: mongoose.Types.ObjectId;
  /** Sole recipient. Enforced by the service layer on every read. */
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  /** Short, non-sensitive summary shown in the list. */
  body?: string;
  /** Opaque ids for client-side navigation (e.g. a recordId or accessRequest id). */
  resourceType?: string;
  resourceId?: string;
  /** Deep-link path within the SPA, e.g. /access-requests. */
  link?: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: [
      'access.requested',
      'access.approved',
      'access.rejected',
      'access.revoked',
      'record.uploaded',
      'security.alert',
      'security.login',
      'ai.completed',
      'verification.completed',
      'appointment.requested',
      'appointment.updated',
      'share.created',
      'share.accessed',
      'emergency.accessed',
    ], index: true },
    severity: { type: String, required: true, enum: ['info', 'success', 'warning', 'critical'], default: 'info' },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, maxlength: 400 },
    resourceType: { type: String, maxlength: 60 },
    resourceId: { type: String, maxlength: 80 },
    link: { type: String, maxlength: 200 },
    readAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// The primary read pattern: newest first, scoped to one recipient.
notificationSchema.index({ recipient: 1, createdAt: -1 });
// Efficient unread counts.
notificationSchema.index({ recipient: 1, readAt: 1 });

export const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ??
  mongoose.model<INotification>('Notification', notificationSchema);