import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as emergencyService from '../services/emergencyService';
import { AuditLog } from '../models/AuditLog';
import { ApiError } from '../utils/ApiError';

const updateProfileSchema = z.object({
  bloodGroup: z.string().max(10).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(40).optional(),
  organDonor: z.boolean().optional(),
  primaryDoctor: z.string().max(120).optional(),
});

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await emergencyService.getEmergencyProfile(req.user!.id);
    res.json({ success: true, data: (profile as any).toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const profile = await emergencyService.updateEmergencyProfile(req.user!, input);

    await AuditLog.create({
      actor: req.user!.id,
      actorRole: req.user!.role,
      action: 'emergency.update',
      resourceId: req.user!.id,
      resourceType: 'EmergencyProfile',
      result: 'SUCCESS',
    });

    res.json({ success: true, data: (profile as any).toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

export const generateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await emergencyService.generateEmergencyToken(req.user!.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// Public endpoint accessed by paramedics/doctors via QR code
export const accessByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    if (!token) throw ApiError.badRequest('Token is required');
    const result = await emergencyService.getProfileByToken(token);

    // Audit the emergency access (unauthenticated)
    await AuditLog.create({
      action: 'emergency.access',
      resourceId: result.patientId,
      resourceType: 'EmergencyProfile',
      result: 'SUCCESS',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { tokenPrefix: token.substring(0, 8) }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
