import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import { aiHealth } from '../services/aiService';
import { blockchainHealth } from '../services/blockchainService';

export const health = asyncHandler(async (_req: Request, res: Response) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  const [blockchain] = await Promise.all([blockchainHealth()]);

  const payload = {
    status: databaseConnected ? 'ok' : 'degraded',
    service: 'medichain-ai-api',
    version: '1.0.0',
    environment: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies: {
      database: { connected: databaseConnected, name: 'mongodb' },
      blockchain: { network: blockchain.network, configured: blockchain.configured, reachable: blockchain.reachable },
      ai: aiHealth(),
    },
  };

  res.status(databaseConnected ? 200 : 503).json({ success: databaseConnected, data: payload });
});
