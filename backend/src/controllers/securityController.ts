import { AccessRequest } from '../models/AccessRequest';
import { ShareToken } from '../models/ShareToken';
import { SecurityEvent } from '../models/SecurityEvent';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import * as securityEventService from '../services/securityEventService';

export const getMySecurityEvents = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const { events, total } = await securityEventService.listSecurityEvents(user.id, limit, skip);

  res.json({
    success: true,
    data: {
      items: events,
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getPrivacyDashboard = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  
  const now = new Date();
  const [activeGrants, activeShareLinks, recentPrivacyEvents, unauthorizedAttempts] = await Promise.all([
    AccessRequest.countDocuments({ patient: user.id, status: 'APPROVED', expiresAt: { $gt: now } }),
    ShareToken.countDocuments({ patient: user.id, isRevoked: false, expiresAt: { $gt: now } }),
    SecurityEvent.find({ userId: user.id, type: { $in: ['CONSENT_REVOKED', 'DATA_EXPORT'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    SecurityEvent.countDocuments({ 
      userId: user.id, 
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT', 
      createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  res.json({
    success: true,
    data: { activeGrants, activeShareLinks, recentPrivacyEvents, unauthorizedAttempts }
  });
});

export const revokeAllAccess = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const now = new Date();

  // 1. Revoke all active access requests
  await AccessRequest.updateMany(
    { patient: user.id, status: 'APPROVED', expiresAt: { $gt: now } },
    { $set: { status: 'REVOKED', updatedAt: now } }
  );

  // 2. Revoke all share tokens
  await ShareToken.updateMany(
    { patient: user.id, isRevoked: false, expiresAt: { $gt: now } },
    { $set: { isRevoked: true } }
  );

  // Log a high-severity security event
  await securityEventService.logSecurityEvent({
    userId: user.id,
    type: 'CONSENT_REVOKED',
    ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    severity: 'high',
    details: { note: 'Global kill-switch activated' },
  });

  res.json({ success: true, data: { message: 'All active access and share links have been revoked.' } });
});
export const rotateEncryptionKeys = asyncHandler(async (req, res) => {
  const { MedicalRecord } = await import('../models/MedicalRecord.js');
  const { env } = await import('../config/env.js');
  const crypto = await import('../utils/encryption.js');

  const currentVersion = env.encryption.keyVersion;
  const records = await MedicalRecord.find({ "encryptedFile.keyVersion": { $ne: currentVersion } });

  let updatedCount = 0;
  for (const record of records) {
    try {
      if (record.encryptedFile) {
        // decrypt old
        const decryptedBuffer = crypto.decryptPayload(record.encryptedFile);
        // encrypt new (will use current version implicitly)
        record.encryptedFile = crypto.encryptBuffer(decryptedBuffer);
        await record.save();
        updatedCount++;
      }
    } catch (err) {
      console.error(`Failed to rotate key for record ${record._id}`, err);
    }
  }

  res.json({ success: true, data: { updatedCount, targetVersion: currentVersion } });
});
