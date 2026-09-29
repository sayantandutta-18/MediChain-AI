import { decryptPayload, encryptBuffer, __resetKeyCache, ENCRYPTION_ALGORITHM } from '../../src/utils/encryption';
import { deterministicId, isValidSha256, sha256 } from '../../src/utils/hash';
import { signAccessToken, verifyAccessToken, extractBearerToken } from '../../src/utils/jwt';

describe('encryption utility (TRD-6)', () => {
  beforeEach(() => __resetKeyCache());

  it('round-trips plaintext through AES-256-GCM', () => {
    const plaintext = Buffer.from('sensitive medical report contents', 'utf8');
    const payload = encryptBuffer(plaintext);

    expect(payload.algorithm).toBe(ENCRYPTION_ALGORITHM);
    expect(payload.data).not.toContain('sensitive');
    expect(decryptPayload(payload)).toEqual(plaintext);
  });

  it('produces a unique IV for every call', () => {
    const first = encryptBuffer(Buffer.from('same input'));
    const second = encryptBuffer(Buffer.from('same input'));

    expect(first.iv).not.toBe(second.iv);
    expect(first.data).not.toBe(second.data);
  });

  it('rejects a tampered ciphertext (GCM tag mismatch)', () => {
    const payload = encryptBuffer(Buffer.from('do not tamper'));
    const tampered = Buffer.from(payload.data, 'base64');
    tampered[0] = tampered[0]! ^ 0xff;

    expect(() => decryptPayload({ ...payload, data: tampered.toString('base64') })).toThrow(
      /decrypt/i,
    );
  });

  it('rejects an unsupported algorithm', () => {
    const payload = encryptBuffer(Buffer.from('x'));
    expect(() =>
      decryptPayload({ ...payload, algorithm: 'aes-128-cbc' as typeof ENCRYPTION_ALGORITHM }),
    ).toThrow(/algorithm/i);
  });

  it('rejects an incomplete payload', () => {
    expect(() =>
      decryptPayload({ data: '', iv: '', authTag: '', algorithm: ENCRYPTION_ALGORITHM, keyVersion: 'v1' }),
    ).toThrow(/incomplete/i);
  });
});

describe('hashing utility (TRD-7)', () => {
  it('produces a stable 64 character SHA-256 digest', () => {
    const digest = sha256(Buffer.from('medichain'));
    expect(digest).toHaveLength(64);
    expect(isValidSha256(digest)).toBe(true);
    expect(sha256(Buffer.from('medichain'))).toBe(digest);
  });

  it('changes when the input changes', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });

  it('rejects malformed digests', () => {
    expect(isValidSha256('nope')).toBe(false);
    expect(isValidSha256('a'.repeat(63))).toBe(false);
  });

  it('builds deterministic ids', () => {
    expect(deterministicId('med', 'a', 'b')).toBe(deterministicId('med', 'a', 'b'));
    expect(deterministicId('med', 'a', 'b')).not.toBe(deterministicId('med', 'a', 'c'));
  });
});

describe('jwt utility (TRD-3)', () => {
  const identity = { id: '507f1f77bcf86cd799439011', role: 'patient' as const, email: 'p@t.dev', name: 'Pat' };

  it('signs and verifies a token', () => {
    const payload = verifyAccessToken(signAccessToken(identity));
    expect(payload.sub).toBe(identity.id);
    expect(payload.role).toBe('patient');
    expect(payload.email).toBe('p@t.dev');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken(identity);
    expect(() => verifyAccessToken(`${token.slice(0, -3)}xyz`)).toThrow(/Invalid authentication token/i);
  });

  it('rejects a token signed with another secret', () => {
    expect(() => verifyAccessToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.bad-signature')).toThrow();
  });

  it('extracts bearer tokens case-insensitively', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer abc')).toBe('abc');
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
  });
});
