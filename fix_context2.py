import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*06\s*\|.*?\|.*?\|.*?\|', '| 06 | Health Analytics | ? COMPLETE + VERIFIED | Added visual AnalyticsPage UI |', content)
content = re.sub(r'\|\s*07\s*\|.*?\|.*?\|.*?\|', '| 07 | AI Health Timeline | ? COMPLETE + VERIFIED | Timeline integrated in UI |', content)
content = re.sub(r'\|\s*11\s*\|.*?\|.*?\|.*?\|', '| 11 | Encryption Key Rotation | ? COMPLETE + VERIFIED | Multi-key cache with scrypt key derivation, bulk rotate endpoint |', content)
content = re.sub(r'\|\s*12\s*\|.*?\|.*?\|.*?\|', '| 12 | MFA / 2FA (TOTP) | ? COMPLETE + VERIFIED | Setup, validation, and login flow via otplib |', content)
content = re.sub(r'\|\s*13\s*\|.*?\|.*?\|.*?\|', '| 13 | Hospital / Organization | ? COMPLETE + VERIFIED | Added Hospital model, directory endpoints, and HospitalsPage UI |', content)
content = re.sub(r'\|\s*21\s*\|.*?\|.*?\|.*?\|', '| 21 | Advanced Record Search | ? COMPLETE + VERIFIED | Date & verification filters added to search |', content)
content = re.sub(r'\|\s*23\s*\|.*?\|.*?\|.*?\|', '| 23 | Data Portability | ? COMPLETE + VERIFIED | JSON Export Data button added to Privacy Dashboard |', content)
content = re.sub(r'\|\s*24\s*\|.*?\|.*?\|.*?\|', '| 24 | Suspicious Access Detection | ? COMPLETE + VERIFIED | Brute-force detection tested in backend |', content)
content = re.sub(r'\|\s*26\s*\|.*?\|.*?\|.*?\|', '| 26 | Voice Health Assistant | ? COMPLETE + VERIFIED | Voice recognition added to AI Assistant |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
