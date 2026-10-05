import { SecurityEvent, type ISecurityEvent } from '../models/SecurityEvent';
import { logger } from '../utils/logger';
import type mongoose from 'mongoose';

interface LogSecurityEventInput {
  userId?: string | mongoose.Types.ObjectId;
  type: ISecurityEvent['type'];
  ipAddress: string;
  userAgent?: string;
  location?: string;
  severity: ISecurityEvent['severity'];
  details?: Record<string, unknown>;
}

/**
 * Persists a high-fidelity security event for the Security Center / Privacy Dashboard.
 * These differ from standard audit logs as they specifically track security-relevant anomalies
 * (failed logins, revoked consents, unauthorized access).
 */
export const logSecurityEvent = async (input: LogSecurityEventInput) => {
  try {
    const event = await SecurityEvent.create(input);
    
    // FEATURE 24: Suspicious Access Detection
    if (input.type === 'LOGIN_FAILED') {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentFailures = await SecurityEvent.countDocuments({
        ipAddress: input.ipAddress,
        type: 'LOGIN_FAILED',
        createdAt: { $gte: fifteenMinsAgo }
      });
      
      // If 5 or more failures from the same IP in 15 mins, flag it as anomalous
      if (recentFailures >= 5) {
        await SecurityEvent.create({
          userId: input.userId,
          type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          severity: 'high',
          details: { reason: 'Brute force login pattern detected', targetEmail: input.details?.email },
        });
        logger.warn(`[SECURITY ALERT] UNAUTHORIZED_ACCESS_ATTEMPT: Brute force detected from IP ${input.ipAddress}`);
      }
    }

    if (input.severity === 'critical') {
      logger.warn(`[SECURITY ALERT] ${input.type} triggered by ${input.userId || 'anonymous'} at ${input.ipAddress}`);
    }
    
    return event;
  } catch (error) {
    logger.error('Failed to log security event', error);
  }
};

export const listSecurityEvents = async (userId: string, limit = 50, skip = 0) => {
  const events = await SecurityEvent.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
  const total = await SecurityEvent.countDocuments({ userId });
  
  return { events, total };
};
