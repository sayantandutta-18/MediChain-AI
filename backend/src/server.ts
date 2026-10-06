import type { Server } from 'http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async (): Promise<Server> => {
  try {
    await connectDatabase();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const target = env.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    logger.error('');
    logger.error('==========================================================');
    logger.error(' Could not connect to MongoDB');
    logger.error('==========================================================');
    logger.error(` Target : ${target}`);
    logger.error(` Reason : ${reason}`);
    logger.error('');
    logger.error(' Fix it with one of these:');
    logger.error('   1. Start the local service -> net start MongoDB');
    logger.error('   2. Use Docker              -> docker run -d -p 27017:27017 --name medichain-mongo mongo:7');
    logger.error('   3. Use MongoDB Atlas       -> set MONGODB_URI in backend/.env');
    logger.error('==========================================================');
    logger.error('');
    process.exit(1);
  }

  const app = createApp();
  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(env.port, host, () => {
    logger.info(`MediChain-AI API listening on ${host}:${env.port} (${env.nodeEnv})`);
    logger.info(`API base: ${env.apiPrefix} | CORS: ${env.security.corsOrigins.join(', ')}`);
    if (!env.sui.packageId) {
      logger.warn('SUI_PACKAGE_ID is not set - blockchain anchors will be recorded as SIMULATED.');
    }
    if (!env.ai.apiKey) {
      logger.warn('OPENAI_API_KEY is not set - AI endpoints will return a controlled 503.');
    }
  });

  const shutdown = (signal: string) => {
    logger.warn(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });

  return server;
};

if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export { start };
