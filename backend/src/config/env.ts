import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const str = (key: string, fallback = ''): string => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const num = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (key: string, fallback: string[]): string[] => {
  const raw = str(key);
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const nodeEnv = str('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const DEFAULT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/json',
  'text/csv',
];

const insecureJwtSecret = 'change-me-to-a-long-random-development-only-secret-value';
const jwtSecret = str('JWT_SECRET', isProduction ? '' : insecureJwtSecret);

if (isProduction && (jwtSecret.length < 32 || jwtSecret === insecureJwtSecret)) {
  throw new Error('JWT_SECRET must be set to a strong (>=32 chars) secret in production.');
}

if (!isTest && !jwtSecret) {
  throw new Error('JWT_SECRET is required.');
}

const encryptionKeyHex = str('ENCRYPTION_KEY').trim();
const encryptionPassphrase = str('ENCRYPTION_PASSPHRASE', jwtSecret);

if (encryptionKeyHex && !/^[0-9a-fA-F]{64}$/.test(encryptionKeyHex)) {
  throw new Error('ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).');
}

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  isDevelopment: !isProduction && !isTest,
  port: num('PORT', 4000),
  apiPrefix: str('API_PREFIX', '/api/v1'),

  mongodbUri: str('MONGODB_URI', 'mongodb://127.0.0.1:27017/medichain'),

  jwt: {
    secret: jwtSecret,
    expiresIn: str('JWT_EXPIRES_IN', '2h'),
    issuer: str('JWT_ISSUER', 'medichain-ai'),
    audience: str('JWT_AUDIENCE', 'medichain-ai-clients'),
  },
  bcryptSaltRounds: num('BCRYPT_SALT_ROUNDS', 10),

  encryption: {
    keyHex: encryptionKeyHex,
    passphrase: encryptionPassphrase,
    keyVersion: str('ENCRYPTION_KEY_VERSION', 'v1'),
  },

  uploads: {
    maxFileSizeBytes: num('MAX_FILE_SIZE_MB', 10) * 1024 * 1024,
    allowedMimeTypes: list('ALLOWED_MIME_TYPES', DEFAULT_MIME_TYPES),
  },

  security: {
    corsOrigins: list('CORS_ORIGIN', ['http://localhost:5173']),
    rateLimitWindowMs: num('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    rateLimitMax: num('RATE_LIMIT_MAX', 300),
    authRateLimitMax: num('AUTH_RATE_LIMIT_MAX', 20),
  },

  sui: {
    network: str('SUI_NETWORK', 'testnet'),
    packageId: str('SUI_PACKAGE_ID'),
    registryId: str('SUI_REGISTRY_ID'),
    mnemonic: str('SUI_ENV_MNEMONIC'),
    editorMode: str('SUI_EDITOR_MODE', 'false') === 'true',
  },

  ai: {
    apiKey: str('OPENAI_API_KEY'),
    model: str('OPENAI_MODEL', 'gpt-4o-mini'),
    timeoutMs: num('AI_TIMEOUT_MS', 45_000),
  },
} as const;

export type AppEnv = typeof env;
