import mongoose, { Schema, type Model } from 'mongoose';
import { USER_ROLES, type UserRole } from '../types/enums';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Doctor-only: shown to patients when approving access. */
  specialty?: string;
  registrationNumber?: string;
  hospital?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: USER_ROLES, index: true },
    specialty: { type: String, trim: true, maxlength: 120 },
    registrationNumber: { type: String, trim: true, maxlength: 60 },
    hospital: { type: String, trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

userSchema.methods.toPublicJSON = function toPublicJSON(this: IUser) {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    ...(this.specialty ? { specialty: this.specialty } : {}),
    ...(this.registrationNumber ? { registrationNumber: this.registrationNumber } : {}),
    ...(this.hospital ? { hospital: this.hospital } : {}),
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ?? mongoose.model<IUser>('User', userSchema);
