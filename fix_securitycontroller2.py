import re

with open('backend/src/controllers/securityController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("encryptedData", "encryptedFile")

with open('backend/src/controllers/securityController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
