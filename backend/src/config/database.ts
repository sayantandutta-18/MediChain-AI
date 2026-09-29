import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (uri: string = env.mongodbUri): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    autoIndex: env.isProduction ? false : true,
  });
  logger.info(`MongoDB connected (${mongoose.connection.name || 'medichain'})`);
  return mongoose;
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
