process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-value-that-is-definitely-long-enough-123456';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.ENCRYPTION_KEY_VERSION = 'test-v1';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.OPENAI_API_KEY = '';
process.env.SUI_PACKAGE_ID = '';
process.env.SUI_REGISTRY_ID = '';
process.env.LOG_LEVEL = 'error';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName: 'medichain-test' });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

jest.setTimeout(60_000);
