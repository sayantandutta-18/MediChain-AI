import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import * as authService from '../services/authService';
import { User } from '../models/User';
import { logSecurityEvent } from '../services/securityEventService';
import { recordAuditEvent } from '../services/auditLogService';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../validators/authValidators';
import type { AuthenticatedUser } from '../types';

type AuditInput = Parameters<typeof recordAuditEvent>[0];

const audit = async (
  req: Request,
  action: AuditInput['action'],
  result: 'SUCCESS' | 'FAILURE',
  overrides: Partial<AuditInput> = {},
): Promise<void> => {
  await recordAuditEvent({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    actorEmail: req.user?.email,
    action,
    result,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    ...overrides,
  });
};

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const session = await authService.registerUser(input);
  // The identity does not exist on `req.user` yet - the session is brand new.
  await audit(req, 'auth.register', 'SUCCESS', {
    actorId: session.user.id,
    actorRole: session.user.role,
    actorEmail: session.user.email,
  });
  res.status(201).json({ success: true, data: session });
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  try {
    const session = await authService.loginUser(input);
    await logSecurityEvent({
      userId: session.user.id,
      type: 'LOGIN_SUCCESS',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      severity: 'low',
    });

    await audit(req, 'auth.login', 'SUCCESS', {
      actorId: session.user.id,
      actorRole: session.user.role,
      actorEmail: session.user.email,
    });
    res.json({ success: true, data: session });
  } catch (error) {
    await logSecurityEvent({
      type: 'LOGIN_FAILED',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      severity: 'medium',
      details: { email: input.email },
    });

    audit(req, 'auth.login_failed', 'FAILURE', { actorEmail: input.email });
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await audit(req, 'auth.logout', 'SUCCESS');
  res.json({ success: true, data: { message: 'Signed out. Remove the token from the client.' } });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  res.json({ success: true, data: { user: await authService.me(user.id) } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user: AuthenticatedUser = currentUser(req);
  const input = updateProfileSchema.parse(req.body);
  res.json({ success: true, data: { user: await authService.updateProfile(user.id, input) } });
});

export const changeMyPassword = asyncHandler(async (req, res) => {
  const user: AuthenticatedUser = currentUser(req);
  const input = changePasswordSchema.parse(req.body);
  const session = await authService.changePassword(user.id, input);
  res.json({ success: true, data: session });
});

export const listDoctors = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  res.json({ success: true, data: { doctors: await authService.listDoctors(search) } });
});

export const setupMfa = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const dbUser = await User.findById(user.id);
  if (!dbUser) throw new Error('User not found');
  
  const otplib = await import('otplib');
  // @ts-ignore
  const authenticator = otplib.authenticator || otplib.default.authenticator;
  const qrcode = await import('qrcode');
  
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'MediChain-AI', secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpauth);
  
  dbUser.twoFactorSecret = secret;
  await dbUser.save();
  
  res.json({ success: true, data: { qrCodeUrl: qrCodeDataUrl, secret } });
});

export const verifyAndEnableMfa = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const dbUser = await User.findById(user.id).select('+twoFactorSecret');
  if (!dbUser) throw new Error('User not found');
  
  const { code } = req.body;
  if (!code) throw new Error('Code required');
  
  const otplib = await import('otplib');
  // @ts-ignore
  const authenticator = otplib.authenticator || otplib.default.authenticator;
  const isValid = authenticator.check(code, dbUser.twoFactorSecret || '');
  if (!isValid) {
    res.status(400).json({ success: false, error: 'Invalid code' });
    return;
  }
  
  dbUser.isTwoFactorEnabled = true;
  await dbUser.save();
  
  res.json({ success: true, message: 'MFA enabled successfully' });
});