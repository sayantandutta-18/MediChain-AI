import { env } from '../config/env';
import { MedicalRecord, type IMedicalRecord } from '../models/MedicalRecord';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { suiAnchorService, type OnChainAnchor } from '../blockchain/suiClient';
import type { VerificationStatus } from '../types';

export interface VerificationReport {
  recordId: string;
  status: VerificationStatus;
  checkedAt: Date;
  mongoHash: string;
  onChainHash: string | null;
  match: boolean;
  network: string;
  transactionDigest: string | null;
  objectId: string | null;
  anchoredAt: string | null;
  message: string;
}

export interface IBlockchainMeta {
  status: IMedicalRecord['blockchain']['status'];
  network: string;
  onChainHash?: string;
  transactionDigest?: string;
  objectId?: string;
  packageId?: string;
  registryId?: string;
  anchoredAt?: Date;
  error?: string;
}

/**
 * TRD-5/TRD-7: upload order is validate -> SHA-256 -> encrypt -> persist -> anchor.
 * The plaintext digest is what gets anchored; the document stays off chain.
 */
export const anchorRecordHash = async (record: IMedicalRecord): Promise<IBlockchainMeta> => {
  const result = await suiAnchorService.anchor({
    recordId: record.recordId,
    recordHash: record.fileHash,
    patientId: record.patient.toString(),
  });

  record.blockchain = {
    status: result.status,
    network: result.network,
    onChainHash: result.onChainHash,
    transactionDigest: result.transactionDigest,
    objectId: result.objectId,
    packageId: result.packageId,
    registryId: result.registryId,
    anchoredAt: result.anchoredAt,
    error: result.error,
  };
  await record.save();

  logger.info(
    `Record ${record.recordId} anchor status=${result.status} object=${result.objectId ?? 'n/a'}`,
  );

  return record.blockchain;
};

/** TRD-7 / PRD-5: compare the MongoDB digest with the digest anchored on chain. */export const verifyRecordIntegrity = async (recordId: string): Promise<VerificationReport> => {
  const record = await MedicalRecord.findOne({ recordId });
  if (!record) {
    throw ApiError.notFound('Medical record not found.', 'RECORD_NOT_FOUND');
  }

  const checkedAt = new Date();
  const mongoHash = record.fileHash;

  const base: Omit<VerificationReport, 'status' | 'onChainHash' | 'match' | 'message'> = {
    recordId,
    checkedAt,
    mongoHash,
    network: record.blockchain?.network ?? env.sui.network,
    transactionDigest: record.blockchain?.transactionDigest ?? null,
    objectId: record.blockchain?.objectId ?? null,
    anchoredAt: record.blockchain?.anchoredAt ? new Date(record.blockchain.anchoredAt).toISOString() : null,
  };

  if (!record.blockchain?.objectId) {
    return {
      ...base,
      status: 'NOT_ANCHORED',
      onChainHash: null,
      match: false,
      message: 'This record has not been anchored on the blockchain yet.',
    };
  }

  if (record.blockchain.status === 'SIMULATED') {
    // There is no chain to read, but the stored digest can still be compared with
    // the digest that was captured at anchor time. A divergence is a real
    // integrity failure; a match is simply not chain-verified yet.
    const anchoredHash = (record.blockchain.onChainHash ?? '').toLowerCase();
    const matches = anchoredHash === mongoHash.toLowerCase();

    return {
      ...base,
      status: matches ? 'UNAVAILABLE' : 'MISMATCH',
      onChainHash: record.blockchain.onChainHash ?? null,
      match: matches,
      message: matches
        ? 'The anchor for this record is simulated because the Sui Move package is not configured, ' +
          'so it cannot be verified against chain state. Configure SUI_PACKAGE_ID / SUI_REGISTRY_ID.'
        : 'Integrity check failed: the stored record no longer matches the digest captured at anchor time.',
    };
  }

  let anchor: OnChainAnchor | null = null;
  try {
    anchor = await suiAnchorService.readAnchor(record.blockchain.objectId);
  } catch (error) {
    logger.error(`Unable to read anchor ${record.blockchain.objectId}`, error);
    return {
      ...base,
      status: 'UNAVAILABLE',
      onChainHash: null,
      match: false,
      message: 'The blockchain node could not be reached for verification. Please retry shortly.',
    };
  }

  if (!anchor) {
    return {
      ...base,
      status: 'UNAVAILABLE',
      onChainHash: null,
      match: false,
      message: 'No on-chain object was found for this record anchor.',
    };
  }

  const onChainHash = anchor.recordHash.toLowerCase();
  const match = onChainHash === mongoHash.toLowerCase();

  return {
    ...base,
    status: match ? 'VERIFIED' : 'MISMATCH',
    onChainHash,
    match,
    message: match
      ? 'The stored record matches the hash anchored on the blockchain.'
      : 'Integrity check failed: the stored record no longer matches the anchored hash.',
  };
};

export const blockchainHealth = () => suiAnchorService.health();
