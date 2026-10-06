import re

with open('backend/src/services/recordService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { CaregiverAccess } = await import('../models/CaregiverAccess.js');\n    ", "")
content = "import { CaregiverAccess } from '../models/CaregiverAccess';\n" + content

with open('backend/src/services/recordService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/src/services/accessControlService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { CaregiverAccess } = await import('../models/CaregiverAccess.js');\n      ", "")
content = "import { CaregiverAccess } from '../models/CaregiverAccess';\n" + content

with open('backend/src/services/accessControlService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/src/services/aiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { CaregiverAccess } = await import('../models/CaregiverAccess.js');\n  ", "")
if "import { CaregiverAccess } from '../models/CaregiverAccess';" not in content:
    content = "import { CaregiverAccess } from '../models/CaregiverAccess';\n" + content

with open('backend/src/services/aiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

