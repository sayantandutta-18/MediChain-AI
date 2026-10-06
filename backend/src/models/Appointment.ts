import mongoose, { Schema, type Model } from 'mongoose';

export interface IAppointment {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['SCHEDULED', 'CANCELLED', 'COMPLETED'], default: 'SCHEDULED' },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export const Appointment: Model<IAppointment> = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', appointmentSchema);
