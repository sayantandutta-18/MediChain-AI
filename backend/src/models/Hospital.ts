import mongoose, { Schema, type Model } from 'mongoose';

export interface IHospital {
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const hospitalSchema = new Schema<IHospital>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    website: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Hospital: Model<IHospital> = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', hospitalSchema);
