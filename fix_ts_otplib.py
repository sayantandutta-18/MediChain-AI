import re

# Fix authController.ts
with open('backend/src/controllers/authController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { authenticator } = await import('otplib');", "// @ts-ignore\n  const otplib = require('otplib');\n  const authenticator = otplib.authenticator;")
with open('backend/src/controllers/authController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix authService.ts
with open('backend/src/services/authService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { authenticator } = await import('otplib');", "// @ts-ignore\n    const otplib = require('otplib');\n    const authenticator = otplib.authenticator;")
with open('backend/src/services/authService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

