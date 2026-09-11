import mongoose, { Document, Schema } from "mongoose";

export interface IMedicalRecord extends Document {
  patientId: mongoose.Types.ObjectId;

  title: string;
  type: string;
  date: Date;

  provider?: string;
  hospital?: string;
  summary?: string;

  // Original file metadata
  fileUrl?: string;
  fileHash?: string;

  // Encrypted file data
  encryptedData?: Buffer;
  iv?: string;
  authTag?: string;

  encrypted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    provider: {
      type: String,
      trim: true,
    },

    hospital: {
      type: String,
      trim: true,
    },

    summary: {
      type: String,
      trim: true,
    },

    fileUrl: {
      type: String,
    },

    fileHash: {
      type: String,
    },

    // AES-256-GCM encrypted file
    encryptedData: {
      type: Buffer,
    },

    // Initialization Vector
    iv: {
      type: String,
    },

    // Authentication Tag
    authTag: {
      type: String,
    },

    encrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const MedicalRecord = mongoose.model<IMedicalRecord>(
  "MedicalRecord",
  medicalRecordSchema
);

export default MedicalRecord;