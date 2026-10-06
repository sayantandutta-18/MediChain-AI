import mongoose, { Schema, type Model } from 'mongoose';

export interface IPrescription {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationName: { type: String, required: true, trim: true, maxlength: 200 },
    dosage: { type: String, required: true, trim: true, maxlength: 100 },
    frequency: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'ACTIVE' },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Prescription: Model<IPrescription> = mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', prescriptionSchema);
