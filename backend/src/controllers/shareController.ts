import type { Request, Response, NextFunction } from 'express';
import * as shareService from '../services/shareService';
import { AuditLog } from '../models/AuditLog';

export const generateRecordToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recordId } = req.body;
    const durationHours = req.body.durationHours ? parseInt(req.body.durationHours, 10) : 24;
    
    const result = await shareService.generateRecordShareToken(req.user!, recordId, durationHours);
    
    // Audit the token generation
    await AuditLog.create({
      actor: req.user!.id,
      actorRole: req.user!.role,
      action: 'record.share_link_generated',
      resourceId: recordId,
      resourceType: 'MedicalRecord',
      result: 'SUCCESS',
      metadata: { durationHours }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const accessRecordByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const result = await shareService.getRecordByToken(token);

    // Audit the unauthenticated access
    await AuditLog.create({
      action: 'record.accessed_via_link',
      resourceId: result.recordId,
      resourceType: 'MedicalRecord',
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

export const downloadRecordByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const { buffer, fileName, mimeType, recordId } = await shareService.downloadRecordByToken(token);

    await AuditLog.create({
      action: 'record.downloaded_via_link',
      resourceId: recordId,
      resourceType: 'MedicalRecord',
      result: 'SUCCESS',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { tokenPrefix: token.substring(0, 8) }
    });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
