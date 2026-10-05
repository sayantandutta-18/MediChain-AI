import re

with open('backend/src/controllers/securityController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

rotation_endpoint = """
export const rotateEncryptionKeys = asyncHandler(async (req, res) => {
  const { MedicalRecord } = await import('../models/MedicalRecord.js');
  const { env } = await import('../config/env.js');
  const crypto = await import('../utils/encryption.js');

  const currentVersion = env.encryption.keyVersion;
  const records = await MedicalRecord.find({ "encryptedData.keyVersion": { $ne: currentVersion } });

  let updatedCount = 0;
  for (const record of records) {
    try {
      if (record.encryptedData) {
        // decrypt old
        const decryptedBuffer = crypto.decryptPayload(record.encryptedData);
        // encrypt new (will use current version implicitly)
        record.encryptedData = crypto.encryptBuffer(decryptedBuffer);
        await record.save();
        updatedCount++;
      }
    } catch (err) {
      console.error(`Failed to rotate key for record ${record._id}`, err);
    }
  }

  res.json({ success: true, data: { updatedCount, targetVersion: currentVersion } });
});
"""

content += rotation_endpoint

with open('backend/src/controllers/securityController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
