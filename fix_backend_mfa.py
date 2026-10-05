import re

# Fix authController.ts
with open('backend/src/controllers/authController.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("await import('../models/User')", "await import('../models/User.js')")
content = content.replace("const otplib = await import('otplib');", "const { authenticator } = await import('otplib');")
content = content.replace("otplib.authenticator.generateSecret()", "authenticator.generateSecret()")
content = content.replace("otplib.authenticator.keyuri", "authenticator.keyuri")
content = content.replace("otplib.authenticator.check", "authenticator.check")

with open('backend/src/controllers/authController.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix authService.ts
with open('backend/src/services/authService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const otplib = require('otplib');", "const { authenticator } = await import('otplib');")
content = content.replace("otplib.authenticator.check", "authenticator.check")
content = content.replace("input.totpCode", "(input as any).totpCode")

with open('backend/src/services/authService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

