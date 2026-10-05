import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { MedicalRecord } from '../models/MedicalRecord';
import { authenticate } from '../middleware/auth';

const router = Router();

export const getRecentTransactions = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find({ 'blockchain.status': 'ANCHORED' })
    .sort({ 'blockchain.anchoredAt': -1 })
    .limit(50)
    .select('recordId title blockchain createdAt');

  const transactions = records.map((r) => ({
    id: r.recordId,
    title: r.title,
    network: r.blockchain.network,
    transactionDigest: r.blockchain.transactionDigest,
    objectId: r.blockchain.objectId,
    anchoredAt: r.blockchain.anchoredAt,
    onChainHash: r.blockchain.onChainHash,
  }));

  res.json({ success: true, data: transactions });
});

router.get('/transactions', authenticate, getRecentTransactions);

export default router;
