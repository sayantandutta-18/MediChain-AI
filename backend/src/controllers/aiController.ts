import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import { aiHealth, analyzeRecord } from '../services/aiService';
import { recordAuditEvent } from '../services/auditLogService';
import { analyzeRecordSchema } from '../validators/aiValidators';

export const analyze = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const input = analyzeRecordSchema.parse(req.body);

  const report = await analyzeRecord(user, input);

  await recordAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    actorEmail: user.email,
    action: 'ai.analyze',
    resourceType: 'MedicalRecord',
    resourceId: input.recordId,
    result: 'SUCCESS',
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.requestId,
    metadata: { model: report.model, findingCount: report.keyFindings.length },
  });

  res.json({ success: true, data: { report } });
});

export const status = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { ai: aiHealth() } });
});
