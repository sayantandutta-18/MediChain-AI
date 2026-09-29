import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { MulterError } from 'multer';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { recordAuditEvent } from '../services/auditLogService';
import type { AuditAction } from '../models/AuditLog';

const inferAuditAction = (req: Request): AuditAction => {
  const path = req.originalUrl;
  if (path.includes('/access-requests')) return 'access.list';
  if (path.includes('/audit-logs')) return 'audit.view';
  if (path.includes('/ai')) return 'ai.analyze';
  if (path.includes('/auth')) return req.method === 'POST' ? 'auth.login' : 'auth.logout';
  if (req.method === 'POST' && path.includes('/records')) return 'record.upload';
  if (req.method === 'GET' && path.includes('/verify')) return 'record.verify';
  if (req.method === 'GET' && path.includes('/download')) return 'record.download';
  if (req.method === 'DELETE') return 'record.delete';
  if (req.method === 'PATCH' || req.method === 'PUT') return 'record.update';
  return 'record.list';
};

const normalise = (error: unknown): ApiError => {  if (error instanceof ApiError) return error;

  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ApiError.payloadTooLarge(
        `File exceeds the ${Math.round(env.uploads.maxFileSizeBytes / (1024 * 1024))}MB limit.`,
      );
    }
    return ApiError.badRequest(`Upload failed: ${error.message}`, 'UPLOAD_ERROR');
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
    return ApiError.validation('The submitted data is invalid.', details);
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('Malformed identifier supplied.', 'INVALID_ID');
  }

  if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
    return ApiError.conflict('A resource with these values already exists.', 'DUPLICATE_RESOURCE');
  }

  if (error instanceof mongoose.Error.MongooseServerSelectionError) {
    return ApiError.serviceUnavailable('Database is unavailable.', 'DATABASE_UNAVAILABLE');
  }

  return ApiError.internal();
};

/** TRD-12: single, centralised error envelope. Never leaks internals. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError = normalise(error);

  if (apiError.statusCode >= 500) {
    logger.error(`[${req.requestId ?? '-'}] ${req.method} ${req.originalUrl} -> ${apiError.code}`, error);
  }

  if (req.body && typeof req.body === 'object') {
    // Avoid persisting passwords.
    if ('password' in req.body) req.body.password = '[redacted]';
  }

  // Denied/failed requests are auditable too (TRD-10) - the action is derived
  // from the route so a failed download is not logged as a generic view.
  void recordAuditEvent({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    actorEmail: req.user?.email,
    action: inferAuditAction(req),
    result: 'FAILURE',
    statusCode: apiError.statusCode,
    reason: apiError.code,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { method: req.method, path: req.originalUrl },
  });

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
      ...(env.isProduction ? {} : { stack: (error as Error)?.stack }),
    },
  });
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`, 'ROUTE_NOT_FOUND'));
};
