import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './ApiError';
import type { UserRole } from '../types/enums';
import type { AuthenticatedUser } from '../types/user';

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
}

export const signAccessToken = (user: AuthenticatedUser): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    subject: user.id,
  };

  return jwt.sign({ role: user.role, email: user.email, name: user.name }, env.jwt.secret, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, env.jwt.secret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }) as TokenPayload;

    if (!decoded.sub || !decoded.role) {
      throw ApiError.unauthorized('Malformed authentication token.', 'INVALID_TOKEN');
    }

    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Session expired. Please sign in again.', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN');
    }
    throw ApiError.unauthorized('Authentication failed.', 'INVALID_TOKEN');
  }
};

export const extractBearerToken = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  return token?.trim() || null;
};
