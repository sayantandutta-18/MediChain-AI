import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { MedicalRecord, type IMedicalRecord } from '../models/MedicalRecord';
import { RecordVersion } from '../models/RecordVersion';
import { User } from '../models/User';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { decryptPayload, encryptBuffer } from '../utils/encryption';
import { sha256 } from '../utils/hash';
import { logger } from '../utils/logger';
import { anchorRecordHash, verifyRecordIntegrity, type VerificationReport } from './blockchainService';
import { assertRecordAccess, listAccessiblePatientIds, loadAuthorizedRecord } from './accessControlService';
import type { AuthenticatedUser } from '../types';
import type { ListRecordsInput, UpdateRecordInput, UploadRecordInput } from '../validators/recordValidators';

const TEXTUAL_MIME_TYPES = new Set([
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
]);

/** Only text based documents are read for the AI context. PDFs stay binary on purpose. */
const extractText = (file: Express.Multer.File): string | undefined => {
  if (!TEXTUAL_MIME_TYPES.has(file.mimetype)) return undefined;
  const text = file.buffer.toString('utf8').replace(/\u0000/g, '').trim();
  if (!text) return undefined;
  return text.slice(0, 20_000);
};

export const toRecordSummary = (record: IMedicalRecord) => ({
  id: record._id.toString(),
  recordId: record.recordId,
  title: record.title,
  description: record.description ?? null,
  category: record.category,
  fileName: record.fileName,
  mimeType: record.mimeType,
  size: record.size,
  fileHash: record.fileHash,
  hasPlainText: Boolean(record.extractedText),
  blockchain: {
    status: record.blockchain?.status ?? 'PENDING',
    network: record.blockchain?.network ?? env.sui.network,
    transactionDigest: record.blockchain?.transactionDigest ?? null,
    objectId: record.blockchain?.objectId ?? null,
    packageId: record.blockchain?.packageId ?? null,
    anchoredAt: record.blockchain?.anchoredAt ? new Date(record.blockchain.anchoredAt).toISOString() : null,
    onChainHash: record.blockchain?.onChainHash ?? null,
  },
  currentVersion: record.currentVersion,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

/**
 * TRD-5: multipart upload -> validation -> SHA-256 -> encryption -> MongoDB -> Sui anchor.
 */
export const createRecord = async (patientId: string, input: UploadRecordInput, file: Express.Multer.File) => {
  const patient = await User.findById(patientId);
  if (!patient) throw ApiError.notFound('Patient account not found.', 'USER_NOT_FOUND');

  // 1. Hash the plaintext so the digest can be anchored independently of the ciphertext.
  const fileHash = sha256(file.buffer);

  // 2. Encrypt before anything is persisted.
  const encryptedFile = encryptBuffer(file.buffer);
  const extractedText = extractText(file);

  // 3. Persist.
  const recordIdStr = `med_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const record = await MedicalRecord.create({
    recordId: recordIdStr,
    patient: patient._id,
    title: input.title,
    description: input.description,
    category: input.category,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileHash,
    encryptedFile,
    extractedText,
    blockchain: { network: env.sui.network, status: 'PENDING' },
    currentVersion: 1,
  } as Partial<IMedicalRecord>);

  await RecordVersion.create({
    recordId: record._id,
    versionNumber: 1,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileHash,
    encryptedFile,
    extractedText,
    blockchain: record.blockchain,
  });

  // 4. Anchor the hash, then persist the blockchain metadata.
  try {
    await anchorRecordHash(record);
    // Sync the version blockchain anchor
    await RecordVersion.updateOne({ recordId: record._id, versionNumber: 1 }, { blockchain: record.blockchain });
  } catch (error) {
    logger.error(`Anchoring failed for record ${record.recordId}`, error);
  }

  return toRecordSummary(record);
};

export const listRecords = async (user: AuthenticatedUser, input: ListRecordsInput) => {
  const filter: Record<string, unknown> = {};

  if (user.role === 'patient') {
    filter.patient = user.id;
  } else {
    // Doctors only see records of patients who granted an unexpired approval.
    const patientIds = await listAccessiblePatientIds(user.id);
    filter.patient = { $in: patientIds };
  }

  if (input.category) filter.category = input.category;
  if (input.search) {
    filter.$or = [
      { title: { $regex: input.search, $options: 'i' } },
      { description: { $regex: input.search, $options: 'i' } },
      { fileName: { $regex: input.search, $options: 'i' } },
    ];
  }

  const skip = (input.page - 1) * input.limit;

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.limit).lean(),
    MedicalRecord.countDocuments(filter),
  ]);

  return {
    items: records.map((record) => toRecordSummary(record as IMedicalRecord)),
    pagination: { page: input.page, limit: input.limit, total, pages: Math.ceil(total / input.limit) || 1 },
  };
};

export const getRecord = async (user: AuthenticatedUser, recordId: string) => {
  const { record } = await loadAuthorizedRecord(user, recordId);
  const patient = await User.findById(record.patient).select('name email').lean();
  return {
    ...toRecordSummary(record),
    patient: patient ? { id: patient._id.toString(), name: patient.name } : null,
  };
};

/** Download: authenticate -> authorize -> retrieve encrypted data -> decrypt -> return. */
export const downloadRecord = async (user: AuthenticatedUser, recordId: string) => {
  const record = await MedicalRecord.findOne({ recordId }).select('+encryptedFile');
  if (!record) throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');

  // Ownership + consent/expiry/revocation are checked before the ciphertext is
  // ever decrypted.
  await assertRecordAccess(user, record, recordId);

  const plaintext = decryptPayload(record.encryptedFile);

  return {
    buffer: plaintext,
    fileName: record.fileName,
    mimeType: record.mimeType,
    title: record.title,
  };
};

export const uploadRecordVersion = async (
  user: AuthenticatedUser,
  recordId: string,
  file: Express.Multer.File,
) => {
  const { record } = await loadAuthorizedRecord(user, recordId);
  
  if (user.role !== 'patient' || record.patient.toString() !== user.id) {
    throw ApiError.forbidden('Only the owning patient can upload a new version.', { code: 'NOT_RECORD_OWNER' });
  }

  const fileHash = sha256(file.buffer);
  const encryptedFile = encryptBuffer(file.buffer);
  const extractedText = extractText(file);

  const nextVersion = record.currentVersion + 1;

  await RecordVersion.create({
    recordId: record._id,
    versionNumber: nextVersion,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    fileHash,
    encryptedFile,
    extractedText,
    blockchain: { network: env.sui.network, status: 'PENDING' },
  });

  // Update MedicalRecord to the latest
  record.currentVersion = nextVersion;
  record.fileName = file.originalname;
  record.mimeType = file.mimetype;
  record.size = file.size;
  record.fileHash = fileHash;
  record.encryptedFile = encryptedFile;
  record.extractedText = extractedText;
  record.blockchain = { network: env.sui.network, status: 'PENDING' };
  
  await record.save();

  try {
    await anchorRecordHash(record);
    await RecordVersion.updateOne({ recordId: record._id, versionNumber: nextVersion }, { blockchain: record.blockchain });
  } catch (error) {
    logger.error(`Anchoring failed for record ${record.recordId} version ${nextVersion}`, error);
  }

  return toRecordSummary(record);
};

/** PRD-4: doctor update/delete of patient records is denied; only the owner can edit. */
export const updateRecord = async (
  user: AuthenticatedUser,
  recordId: string,
  input: UpdateRecordInput,
): Promise<ReturnType<typeof toRecordSummary>> => {
  const record = await MedicalRecord.findOne({ recordId });
  if (!record) throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');

  if (user.role !== 'patient' || record.patient.toString() !== user.id) {
    throw ApiError.forbidden('Only the owning patient can modify this record.', { code: 'NOT_RECORD_OWNER' });
  }

  if (input.title !== undefined) record.title = input.title;
  if (input.description !== undefined) record.description = input.description;
  if (input.category !== undefined) record.category = input.category;

  await record.save();
  return toRecordSummary(record);
};

export const listRecordVersions = async (user: AuthenticatedUser, recordId: string) => {
  const { record } = await loadAuthorizedRecord(user, recordId);
  
  const versions = await RecordVersion.find({ recordId: record._id }).sort({ versionNumber: -1 });
  
  return versions.map((v) => ({
    versionNumber: v.versionNumber,
    fileName: v.fileName,
    mimeType: v.mimeType,
    size: v.size,
    fileHash: v.fileHash,
    blockchain: v.blockchain,
    createdAt: v.createdAt.toISOString(),
  }));
};

export const getTimeline = async (user: AuthenticatedUser) => {
  const accessiblePatientIds = user.role === 'patient' 
    ? [user.id] 
    : await listAccessiblePatientIds(user.id);

  if (accessiblePatientIds.length === 0) return [];

  // Get all records the user can access
  const records = await MedicalRecord.find({ patient: { $in: accessiblePatientIds } }).lean();
  const recordMap = new Map(records.map((r) => [r._id.toString(), r]));

  // Get all versions for these records
  const versions = await RecordVersion.find({ recordId: { $in: records.map(r => r._id) } }).lean();

  const timelineEvents = versions.map((v) => {
    const parent = recordMap.get(v.recordId.toString())!;
    return {
      eventId: v._id.toString(),
      recordId: parent.recordId,
      title: parent.title,
      category: parent.category,
      versionNumber: v.versionNumber,
      fileName: v.fileName,
      size: v.size,
      blockchain: v.blockchain,
      createdAt: v.createdAt,
      type: v.versionNumber === 1 ? 'CREATED' : 'UPDATED',
    };
  });

  // Sort descending by date
  timelineEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return timelineEvents;
};

export const downloadRecordVersion = async (user: AuthenticatedUser, recordId: string, versionNumber: number) => {
  const { record } = await loadAuthorizedRecord(user, recordId);
  
  const version = await RecordVersion.findOne({ recordId: record._id, versionNumber }).select('+encryptedFile');
  if (!version) throw ApiError.notFound('Version not found.', 'VERSION_NOT_FOUND');
  
  const decryptedContent = decryptPayload(version.encryptedFile);

  return {
    buffer: decryptedContent,
    mimeType: version.mimeType,
    fileName: version.fileName,
  };
};

export const deleteRecord = async (user: AuthenticatedUser, recordId: string) => {
  const record = await MedicalRecord.findOne({ recordId });
  if (!record) throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');

  if (user.role !== 'patient' || record.patient.toString() !== user.id) {
    throw ApiError.forbidden('Only the owning patient can delete this record.', { code: 'NOT_RECORD_OWNER' });
  }

  await RecordVersion.deleteMany({ recordId: record._id });
  await record.deleteOne();
  return { recordId, deleted: true };
};

export const verifyIntegrity = async (
  user: AuthenticatedUser,
  recordId: string,
): Promise<VerificationReport & { title: string }> => {
  const record = await MedicalRecord.findOne({ recordId });
  if (!record) throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');

  await loadAuthorizedRecord(user, recordId);

  const report = await verifyRecordIntegrity(recordId);
  return { ...report, title: record.title };
};

export const recordStats = async (user: AuthenticatedUser) => {
  // Aggregation does not cast values, so the ids must be real ObjectIds here.
  const filter =
    user.role === 'patient'
      ? { patient: new mongoose.Types.ObjectId(user.id) }
      : { patient: { $in: (await listAccessiblePatientIds(user.id)).map((id) => new mongoose.Types.ObjectId(id)) } };

  const [total, anchored, unanchored, categories] = await Promise.all([
    MedicalRecord.countDocuments(filter),
    MedicalRecord.countDocuments({ ...filter, 'blockchain.status': { $in: ['ANCHORED', 'SIMULATED'] } }),
    MedicalRecord.countDocuments({ ...filter, 'blockchain.status': { $in: ['PENDING', 'FAILED'] } }),
    MedicalRecord.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    total,
    anchored,
    unanchored,
    categories: categories.map((item) => ({ category: item._id as string, count: item.count as number })),
  };
};
