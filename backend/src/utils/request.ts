import type { Request } from 'express';
import { ApiError } from './ApiError';

/**
 * Express types route params as possibly-undefined. Routes are validated by zod
 * before the controller runs, so a missing value here is a programming error.
 */
export const pathParam = (req: Request, name: string): string => {
  const value = (req.params as Record<string, string | undefined>)[name];
  if (!value) {
    throw ApiError.internal(`Route parameter "${name}" is missing.`, 'MISSING_ROUTE_PARAM');
  }
  return value;
};
