import re

with open('context.md', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\|\s*18\s*\|.*?\|.*?\|.*?\|', '| 18 | Medical Data Import | ? COMPLETE + VERIFIED | Included import via Privacy Dashboard JSON parser |', content)

with open('context.md', 'w', encoding='utf-8') as f:
    f.write(content)
