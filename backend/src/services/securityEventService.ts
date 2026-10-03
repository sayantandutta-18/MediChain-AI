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
    
    // Auto-alert on critical severity
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
