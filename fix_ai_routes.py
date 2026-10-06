import re

with open('backend/src/routes/aiRoutes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content += "\nrouter.post('/compare', authenticate, aiController.compareRecords);\n"

with open('backend/src/routes/aiRoutes.ts', 'w', encoding='utf-8') as f:
    f.write(content)
