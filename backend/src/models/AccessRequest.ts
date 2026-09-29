import mongoose, { Schema, type Model } from 'mongoose';
import { ACCESS_REQUEST_STATUSES, type AccessRequestStatus } from '../types/enums';

export interface IAccessRequest {
  _id: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  reason: string;
  /** Optional free-form purpose that the patient sees before deciding. */
  purpose?: string;
  status: AccessRequestStatus;
  decisionNote?: string;
  requestedAt: Date;
  decidedAt?: Date;
  /** Time bounded grant created by approval (TRD-9). */
  approvedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const accessRequestSchema = new Schema<IAccessRequest>(
  {
    doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    purpose: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ACCESS_REQUEST_STATUSES, default: 'PENDING', index: true },
    decisionNote: { type: String, trim: true, maxlength: 1000 },
    requestedAt: { type: Date, default: Date.now },
    decidedAt: { type: Date },
    approvedAt: { type: Date },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// A doctor may only have one open request per patient.
accessRequestSchema.index(
  { doctor: 1, patient: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'APPROVED'] } } },
);

export const AccessRequest: Model<IAccessRequest> =
  (mongoose.models.AccessRequest as Model<IAccessRequest>) ??
  mongoose.model<IAccessRequest>('AccessRequest', accessRequestSchema);
