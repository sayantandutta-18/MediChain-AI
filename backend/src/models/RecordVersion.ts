import mongoose, { Schema, type Model } from 'mongoose';
import { type IBlockchainAnchor } from './MedicalRecord';
import { type IEncryptedFile } from './MedicalRecord';

export interface IRecordVersion {
  _id: mongoose.Types.ObjectId;
  /** Link to the parent MedicalRecord */
  recordId: mongoose.Types.ObjectId;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  size: number;
  fileHash: string;
  encryptedFile: IEncryptedFile;
  extractedText?: string;
  blockchain: IBlockchainAnchor;
  createdAt: Date;
  updatedAt: Date;
}

const encryptedFileSchema = new Schema<IEncryptedFile>(
  {
    data: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    algorithm: { type: String, required: true },
    keyVersion: { type: String, required: true },
  },
  { _id: false },
);

const blockchainSchema = new Schema<IBlockchainAnchor>(
  {
    status: { type: String, required: true, enum: ['PENDING', 'ANCHORED', 'SIMULATED', 'FAILED'] },
    network: { type: String, required: true },
    onChainHash: { type: String },
    transactionDigest: { type: String },
    objectId: { type: String },
    packageId: { type: String },
    registryId: { type: String },
    anchoredAt: { type: Date },
    error: { type: String },
  },
  { _id: false },
);

const recordVersionSchema = new Schema<IRecordVersion>(
  {
    recordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord', required: true, index: true },
    versionNumber: { type: Number, required: true },
    fileName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    fileHash: { type: String, required: true },
    encryptedFile: { type: encryptedFileSchema, required: true, select: false },
    extractedText: { type: String, select: false, maxlength: 60_000 },
    blockchain: { type: blockchainSchema, required: true },
  },
  { timestamps: true, versionKey: false },
);

recordVersionSchema.index({ recordId: 1, versionNumber: 1 }, { unique: true });

export const RecordVersion: Model<IRecordVersion> =
  (mongoose.models.RecordVersion as Model<IRecordVersion>) ?? mongoose.model<IRecordVersion>('RecordVersion', recordVersionSchema);
