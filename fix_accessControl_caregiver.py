import re

with open('backend/src/services/accessControlService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"""  if \(user\.role === 'patient'\) \{
    if \(record\.patient\.toString\(\) !== user\.id\) \{
      throw ApiError\.forbidden\('You can only access your own medical records\.', \{
        code: 'NOT_RECORD_OWNER',
      \}\);
    \}
    return \{ accessRequest: null \};
  \}"""

replacement = """  if (user.role === 'patient') {
    if (record.patient.toString() !== user.id) {
      const { CaregiverAccess } = await import('../models/CaregiverAccess.js');
      const isCaregiver = await CaregiverAccess.exists({ caregiverId: user.id, patientId: record.patient, isActive: true });
      if (!isCaregiver) {
        throw ApiError.forbidden('You can only access your own medical records.', {
          code: 'NOT_RECORD_OWNER',
        });
      }
    }
    return { accessRequest: null };
  }"""

content = re.sub(pattern, replacement, content)

with open('backend/src/services/accessControlService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
