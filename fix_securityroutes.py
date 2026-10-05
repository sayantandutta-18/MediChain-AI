import re

with open('backend/src/routes/securityRoutes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content += "\nrouter.post('/rotate-keys', authenticate, securityController.rotateEncryptionKeys);\n"

with open('backend/src/routes/securityRoutes.ts', 'w', encoding='utf-8') as f:
    f.write(content)
