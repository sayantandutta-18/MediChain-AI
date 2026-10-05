import re

with open('frontend/src/pages/LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'(\s*const apiError = toError\(err\);\s*reportFailure\(err\);\s*)(setError\(isApiOffline\(apiError\)\s*\?\s*null\s*:\s*apiError\.message\);\s*setFieldErrors\(isApiOffline\(apiError\)\s*\?\s*\{\}\s*:\s*toFieldErrors\(apiError\)\);)'
replacement = r'''\1if (apiError.code === 'MFA_REQUIRED') {
          setRequiresMfa(true);
          setError('Two-factor authentication required.');
        } else {
          \2
        }'''
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/src/pages/LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
