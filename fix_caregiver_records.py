import re

with open('backend/src/services/recordService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"""  if \(user\.role === 'patient'\) \{
    filter\.patient = user\.id;
  \} else \{"""

replacement = """  if (user.role === 'patient') {
    const { CaregiverAccess } = await import('../models/CaregiverAccess.js');
    const caregiverGrants = await CaregiverAccess.find({ caregiverId: user.id, isActive: true });
    const accessiblePatientIds = [user.id, ...caregiverGrants.map(g => g.patientId.toString())];
    filter.patient = { $in: accessiblePatientIds };
  } else {"""

content = re.sub(pattern, replacement, content)

with open('backend/src/services/recordService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
