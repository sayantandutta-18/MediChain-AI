import mongoose, { Schema, type Model } from 'mongoose';

export type ShareTokenType = 'EMERGENCY' | 'RECORD';

export interface IShareToken {
  _id: mongoose.Types.ObjectId;
  token: string;
  type: ShareTokenType;
  patient: mongoose.Types.ObjectId;
  recordId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const shareTokenSchema = new Schema<IShareToken>(
  {
    token: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ['EMERGENCY', 'RECORD'] },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    expiresAt: { type: Date, required: true, index: true },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export const ShareToken: Model<IShareToken> =
  (mongoose.models.ShareToken as Model<IShareToken>) ?? mongoose.model<IShareToken>('ShareToken', shareTokenSchema);
