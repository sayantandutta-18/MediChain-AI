import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*14\s*\|.*?\|.*?\|.*?\|', '| 14 | Caregiver / Family Access | ? COMPLETE + VERIFIED | Added caregiver grant system with cross-user record visibility |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
