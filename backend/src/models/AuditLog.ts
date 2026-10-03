import mongoose, { Schema, type Model } from 'mongoose';
import { USER_ROLES, type AuditResult, type UserRole } from '../types/enums';

export type AuditAction =
  | 'auth.register'
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'record.upload'
  | 'record.list'
  | 'record.view'
  | 'record.download'
  | 'record.update'
  | 'record.delete'
  | 'record.verify'
  | 'access.request'
  | 'access.approve'
  | 'access.reject'
  | 'access.revoke'
  | 'access.list'
  | 'ai.analyze'
  | 'audit.view'
  | 'notification.mark_all_read'
  | 'admin.verify_doctor'
  | 'emergency.access'
  | 'emergency.update'
  | 'record.share_link_generated'
  | 'record.accessed_via_link'
  | 'record.downloaded_via_link';

export interface IAuditLog {
  actor?: mongoose.Types.ObjectId;
  actorRole?: UserRole;
  actorEmail?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  result: AuditResult;
  statusCode?: number;
  reason?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: USER_ROLES },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    resourceType: { type: String },
    resourceId: { type: String },
    result: { type: String, required: true, enum: ['SUCCESS', 'FAILURE'], index: true },
    statusCode: { type: Number },
    reason: { type: String, maxlength: 500 },
    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ??
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
