import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../models/User';
import { MedicalRecord } from '../models/MedicalRecord';
import { encryptBuffer } from '../utils/encryption';
import { sha256 } from '../utils/hash';
import { authenticate, currentUser } from '../middleware/auth';

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

export const importUserData = asyncHandler(async (req, res) => {
  const user = currentUser(req);
  if (!req.file) throw new Error('No file provided');
  
  const parsed = JSON.parse(req.file.buffer.toString('utf8'));
  if (!parsed.profile || !parsed.records) throw new Error('Invalid export format');

  let importedRecords = 0;
  for (const record of parsed.records) {
    const existing = await MedicalRecord.findOne({ recordId: record.recordId });
    if (!existing) {
      const dummyBuffer = Buffer.from('Imported data without raw file', 'utf8');
      await MedicalRecord.create({
        patient: user.id,
        recordId: record.recordId,
        title: record.title,
        description: record.description,
        category: record.category,
        fileName: record.fileName || 'imported.txt',
        mimeType: record.mimeType || 'text/plain',
        size: dummyBuffer.length,
        fileHash: sha256(dummyBuffer),
        encryptedFile: encryptBuffer(dummyBuffer),
        extractedText: 'Imported',
        blockchain: { status: 'PENDING' },
      });
      importedRecords++;
    }
  }

  res.json({ success: true, message: `Imported ${importedRecords} records` });
});

router.post('/import', authenticate, upload.single('file'), importUserData);

export default router;
