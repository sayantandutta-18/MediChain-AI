import { createHash, randomBytes } from 'crypto';

const HEX_64 = /^[0-9a-f]{64}$/;

/**
 * TRD-7: every relevant file receives a SHA-256 hexadecimal digest.
 * The digest (never the document) is what gets anchored on chain.
 */
export const sha256 = (input: Buffer | string): string =>
  createHash('sha256').update(input).digest('hex');

export const isValidSha256 = (value: string): boolean => HEX_64.test(value);

/** Deterministic id helper so the same logical entity gets the same id. */
export const deterministicId = (prefix: string, ...parts: string[]): string =>
  `${prefix}_${sha256(parts.join('|')).slice(0, 24)}`;

export const randomToken = (bytes = 24): string => randomBytes(bytes).toString('hex');
