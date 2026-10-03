import mongoose, { Schema, type Model } from 'mongoose';

export interface ISecurityEvent {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'UNAUTHORIZED_ACCESS_ATTEMPT' | 'DATA_EXPORT' | 'CONSENT_REVOKED';
  ipAddress: string;
  userAgent?: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
  createdAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      required: true,
      enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_RESET', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'DATA_EXPORT', 'CONSENT_REVOKED'],
    },
    ipAddress: { type: String, required: true },
    userAgent: { type: String },
    location: { type: String },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// Helpful for filtering and analytics
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });

export const SecurityEvent: Model<ISecurityEvent> =
  (mongoose.models.SecurityEvent as Model<ISecurityEvent>) ?? mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);
