import mongoose, { Schema, type Model } from 'mongoose';

export interface ICaregiverAccess {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  caregiverId: mongoose.Types.ObjectId;
  relation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const caregiverAccessSchema = new Schema<ICaregiverAccess>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caregiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    relation: { type: String, required: true, trim: true, maxlength: 60 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

caregiverAccessSchema.index({ patientId: 1, caregiverId: 1 }, { unique: true });

export const CaregiverAccess: Model<ICaregiverAccess> = mongoose.models.CaregiverAccess || mongoose.model<ICaregiverAccess>('CaregiverAccess', caregiverAccessSchema);
