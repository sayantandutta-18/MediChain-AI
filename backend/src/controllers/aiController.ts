import { asyncHandler } from '../utils/asyncHandler';
import { currentUser } from '../middleware/auth';
import { aiHealth, analyzeRecord, generateTimelineNarrative, compareRecords as compareRecordsService } from '../services/aiService';
import { recordAuditEvent } from '../services/auditLogService';
import { analyzeRecordSchema } from '../validators/aiValidators';

export const generateTimeline = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const result = await generateTimelineNarrative(user, req.query);
  res.json({ success: true, data: result });
});

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

export const compareRecords = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const { recordIds, language } = req.body;
  
  if (!Array.isArray(recordIds) || recordIds.length !== 2) {
    res.status(400).json({ success: false, error: 'Must provide an array of exactly 2 record IDs' });
    return;
  }
  
  const report = await compareRecordsService(user, recordIds, language);
  
  res.json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      report,
    },
  });
});
