import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../config/env';

const handler = (): RateLimitRequestHandler =>
  rateLimit({
    windowMs: env.security.rateLimitWindowMs,
    limit: env.security.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please slow down.' },
    },
  });

export const apiLimiter = handler();

/** Stricter limit on credential endpoints to blunt brute force attempts. */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.security.rateLimitWindowMs,
  limit: env.security.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts.' },
  },
});
