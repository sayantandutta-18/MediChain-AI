import mongoose, { Schema, type Model } from 'mongoose';
import type { AnchorStatus } from '../types/enums';
import { ENCRYPTION_ALGORITHM, type EncryptedPayload } from '../utils/encryption';

export interface IBlockchainAnchor {
  status: AnchorStatus;
  network: string;
  /** SHA-256 digest anchored on chain (hex) - never the document itself. */
  onChainHash?: string;
  transactionDigest?: string;
  objectId?: string;
  packageId?: string;
  registryId?: string;
  anchoredAt?: Date;
  error?: string;
}

export interface IEncryptedFile extends EncryptedPayload {}

export interface IMedicalRecord {
  _id: mongoose.Types.ObjectId;
  /** Human friendly, globally unique record id also used on chain. */
  recordId: string;
  patient: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  fileName: string;
  mimeType: string;
  /** Original (plaintext) size in bytes. */
  size: number;
  /** SHA-256 of the original plaintext file (hex) - TRD-7. */
  fileHash: string;
  encryptedFile: IEncryptedFile;
  /** Plaintext only, for text-like documents, used to build the AI context. */
  extractedText?: string;
  blockchain: IBlockchainAnchor;
  currentVersion: number;
  createdAt: Date;
  updatedAt: Date;
  save(): Promise<this>;
}

/**
 * The whole `encryptedFile` sub-document is excluded from normal queries and is
 * only pulled in with `.select('+encryptedFile')` on the authorised download path.
 */
const encryptedFileSchema = new Schema<IEncryptedFile>(
  {
    data: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    algorithm: { type: String, required: true, enum: [ENCRYPTION_ALGORITHM], default: ENCRYPTION_ALGORITHM },
    keyVersion: { type: String, required: true },
  },
  { _id: false },
);

const blockchainSchema = new Schema<IBlockchainAnchor>(
  {
    status: {
      type: String,
      enum: ['PENDING', 'ANCHORED', 'SIMULATED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
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

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: ['lab-report', 'prescription', 'imaging', 'discharge-summary', 'vaccination', 'other'],
      default: 'other',
    },
    fileName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    fileHash: { type: String, required: true, index: true },
    encryptedFile: { type: encryptedFileSchema, required: true, select: false },
    extractedText: { type: String, select: false, maxlength: 60_000 },
    blockchain: { type: blockchainSchema, required: true, default: () => ({ network: 'testnet', status: 'PENDING' }) },
    currentVersion: { type: Number, default: 1, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Only the owning patient can read the encrypted blob.
medicalRecordSchema.index({ patient: 1, createdAt: -1 });

export const MedicalRecord: Model<IMedicalRecord> =
  (mongoose.models.MedicalRecord as Model<IMedicalRecord>) ??
  mongoose.model<IMedicalRecord>('MedicalRecord', medicalRecordSchema);
