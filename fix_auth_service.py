import re

with open('backend/src/services/authService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace loginUser
pattern = r'(export const loginUser = async \(input: LoginInput\) => \{.*?)(return issueSession\(user\);)(\n\};)'
replacement = r'''\1
  if (user.isTwoFactorEnabled) {
    if (!input.totpCode) {
      throw ApiError.unauthorized('MFA code required.', 'MFA_REQUIRED');
    }
    const otplib = require('otplib');
    const isValid = otplib.authenticator.check(input.totpCode, user.twoFactorSecret || '');
    if (!isValid) {
      throw ApiError.unauthorized('Invalid MFA code.', 'INVALID_MFA_CODE');
    }
  }

  \2\3'''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('backend/src/services/authService.ts', 'w', encoding='utf-8') as f:
    f.write(content)
