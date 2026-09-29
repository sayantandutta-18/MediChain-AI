import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';
import type { UserRole } from '../types/enums';
import type { AuthenticatedUser } from '../types/user';

/**
 * TRD-3: verifies the Bearer token and attaches the identity + role to the request.
 * Missing / invalid credentials always produce 401.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    next(ApiError.unauthorized('Authentication token is missing.', 'TOKEN_MISSING'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    } satisfies AuthenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
};

/** TRD-4: role check only. Ownership / consent checks live in the services. */
export const authorize = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        ApiError.forbidden(
          `This action requires one of the following roles: ${roles.join(', ')}.`,
          { requiredRoles: roles, actualRole: req.user.role },
        ),
      );
      return;
    }
    next();
  };
};

export const requireRole = (role: UserRole): RequestHandler => authorize(role);

/** Throws 401 when the user is missing - used by services that take `user` explicitly. */
export const currentUser = (req: Request): AuthenticatedUser => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};
