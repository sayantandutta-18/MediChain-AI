import mongoose, { Schema, type Model } from 'mongoose';

export interface IEmergencyProfile {
  _id: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  bloodGroup?: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  organDonor: boolean;
  primaryDoctor?: string;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const emergencyProfileSchema = new Schema<IEmergencyProfile>(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodGroup: { type: String, trim: true, maxlength: 10 },
    allergies: { type: [String], default: [] },
    medications: { type: [String], default: [] },
    conditions: { type: [String], default: [] },
    emergencyContactName: { type: String, trim: true, maxlength: 120 },
    emergencyContactPhone: { type: String, trim: true, maxlength: 40 },
    organDonor: { type: Boolean, default: false },
    primaryDoctor: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true, versionKey: false },
);

emergencyProfileSchema.methods.toPublicJSON = function toPublicJSON(this: IEmergencyProfile) {
  return {
    id: this._id.toString(),
    patientId: this.patient.toString(),
    bloodGroup: this.bloodGroup ?? null,
    allergies: this.allergies,
    medications: this.medications,
    conditions: this.conditions,
    emergencyContactName: this.emergencyContactName ?? null,
    emergencyContactPhone: this.emergencyContactPhone ?? null,
    organDonor: this.organDonor,
    primaryDoctor: this.primaryDoctor ?? null,
    updatedAt: this.updatedAt,
  };
};

export const EmergencyProfile: Model<IEmergencyProfile> =
  (mongoose.models.EmergencyProfile as Model<IEmergencyProfile>) ??
  mongoose.model<IEmergencyProfile>('EmergencyProfile', emergencyProfileSchema);
