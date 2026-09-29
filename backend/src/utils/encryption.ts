import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { env } from '../config/env';
import { ApiError } from './ApiError';

export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const IV_LENGTH = 12;
export const AUTH_TAG_LENGTH = 16;

export interface EncryptedPayload {
  /** base64 ciphertext */
  data: string;
  /** base64 initialisation vector */
  iv: string;
  /** base64 GCM authentication tag */
  authTag: string;
  algorithm: typeof ENCRYPTION_ALGORITHM;
  keyVersion: string;
}

let cachedKey: Buffer | null = null;

const resolveKey = (): Buffer => {
  if (cachedKey) return cachedKey;

  const { keyHex, passphrase } = env.encryption;

  if (keyHex) {
    cachedKey = Buffer.from(keyHex, 'hex');
  } else {
    if (!passphrase) {
      throw ApiError.internal('Server encryption key is not configured.', 'ENCRYPTION_MISCONFIGURED');
    }
    // Deterministic 32 byte key derived from the passphrase (scrypt, N=2^15).
    cachedKey = scryptSync(passphrase, 'medichain-ai.encryption.salt.v1', 32);
  }

  if (cachedKey.length !== 32) {
    throw ApiError.internal('Server encryption key must be 32 bytes.', 'ENCRYPTION_MISCONFIGURED');
  }

  return cachedKey;
};

/** Test helper: forget the memoised key. */
export const __resetKeyCache = (): void => {
  cachedKey = null;
};

/**
 * TRD-6: content is encrypted *before* it reaches the database.
 * AES-256-GCM gives confidentiality + integrity of the stored blob.
 */
export const encryptBuffer = (plaintext: Buffer): EncryptedPayload => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    data: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ENCRYPTION_ALGORITHM,
    keyVersion: env.encryption.keyVersion,
  };
};

export const decryptPayload = (payload: EncryptedPayload): Buffer => {
  if (!payload?.data || !payload?.iv || !payload?.authTag) {
    throw ApiError.internal('Encrypted payload is incomplete.', 'DECRYPTION_FAILED');
  }

  if (payload.algorithm !== ENCRYPTION_ALGORITHM) {
    throw ApiError.internal(
      `Unsupported encryption algorithm: ${String(payload.algorithm)}`,
      'DECRYPTION_FAILED',
    );
  }

  try {
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, resolveKey(), Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]);
  } catch {
    throw ApiError.internal('Unable to decrypt the stored record.', 'DECRYPTION_FAILED');
  }
};

export const encryptText = (text: string): string => encryptBuffer(Buffer.from(text, 'utf8')).data;

export const decryptText = (payload: EncryptedPayload): string => decryptPayload(payload).toString('utf8');
